from flask import Flask, request, render_template, jsonify
from flask_cors import CORS
import mysql.connector
from datetime import datetime, date

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '10451236aA@',
    'database': 'marketing_db',
    'auth_plugin': 'mysql_native_password'
}

def connectDb(without_db=False):
    """Conecta ao MySQL. Se without_db=True, conecta sem selecionar um banco específico."""
    try:
        config = db_config.copy()
        if without_db:
            config.pop('database')
        return mysql.connector.connect(**config)
    except mysql.connector.Error as e:
        print(f"Erro ao conectar ao banco de dados: {e}")
        return None

def create_database():
    """Cria o banco de dados caso ele não exista."""
    conn = connectDb(without_db=True)
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("CREATE DATABASE IF NOT EXISTS marketing_db")
            print("Banco de dados 'marketing_db' verificado/criado com sucesso.")
        except mysql.connector.Error as e:
            print(f"Erro ao criar banco de dados: {e}")
        finally:
            cursor.close()
            conn.close()

def create_tables():
    """Cria as tabelas tipo_acao e acao caso ainda não existam."""
    conn = connectDb()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS tipo_acao (
                    codigo_acao INT AUTO_INCREMENT PRIMARY KEY,
                    nome_acao VARCHAR(100) NOT NULL
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS acao (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    codigo_acao INT,
                    investimento DECIMAL(10, 2) NOT NULL,
                    data_prevista DATE NOT NULL,
                    data_cadastro DATE NOT NULL,
                    FOREIGN KEY (codigo_acao) REFERENCES tipo_acao (codigo_acao)
                )
            ''')
            
            # Verificar se há tipos de ação cadastrados
            cursor.execute("SELECT COUNT(*) FROM tipo_acao")
            count = cursor.fetchone()[0]
            
            # Se não houver tipos de ação, insere os padrões
            if count == 0:
                tipos_acao = ["Palestra", "Apoio Gráfico", "Evento", "Reunião"]
                for tipo in tipos_acao:
                    cursor.execute("INSERT INTO tipo_acao (nome_acao) VALUES (%s)", (tipo,))
            
            conn.commit()
            print("Tabelas 'tipo_acao' e 'acao' verificadas/criadas com sucesso.")
        except mysql.connector.Error as e:
            print(f"Erro ao criar tabelas: {e}")
        finally:
            cursor.close()
            conn.close()

create_database()
create_tables()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/tipos_acao', methods=['GET'])
def get_tipos_acao():
    conn = connectDb()
    if not conn:
        return jsonify({'error': 'Erro ao conectar ao banco de dados'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT * FROM tipo_acao')
        tipos = cursor.fetchall()
        return jsonify(tipos), 200
    except mysql.connector.Error as e:
        return jsonify({'error': f'Erro ao buscar tipos de ação: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/tipos_acao', methods=['POST'])
def add_tipo_acao():
    data = request.json
    if not data or 'nome_acao' not in data:
        return jsonify({'error': 'Dados inválidos'}), 400

    nome_acao = data['nome_acao']
    if not nome_acao.strip():
        return jsonify({'error': 'Nome da ação não pode ser vazio'}), 400

    conn = connectDb()
    if not conn:
        return jsonify({'error': 'Erro ao conectar ao banco de dados'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute('INSERT INTO tipo_acao (nome_acao) VALUES (%s)', (nome_acao,))
        conn.commit()
        return jsonify({'message': 'Tipo de ação criado com sucesso!', 'id': cursor.lastrowid}), 201
    except mysql.connector.Error as e:
        return jsonify({'error': f'Erro ao criar tipo de ação: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/acoes', methods=['GET'])
def get_acoes():
    conn = connectDb()
    if not conn:
        return jsonify({'error': 'Erro ao conectar ao banco de dados'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('''
            SELECT a.id, t.codigo_acao, t.nome_acao, a.data_prevista, a.investimento, a.data_cadastro
            FROM acao a
            JOIN tipo_acao t ON a.codigo_acao = t.codigo_acao
        ''')
        acoes = cursor.fetchall()
        for acao in acoes:
            acao['data_prevista'] = acao['data_prevista'].strftime('%Y-%m-%d')
            acao['data_cadastro'] = acao['data_cadastro'].strftime('%Y-%m-%d')
        return jsonify(acoes), 200
    except mysql.connector.Error as e:
        return jsonify({'error': f'Erro ao buscar ações: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/acoes', methods=['POST'])
def add_acao():
    data = request.json
    if not data:
        return jsonify({'error': 'Nenhum dado recebido'}), 400

    try:
        codigo_acao = int(data['codigo_acao'])
        data_prevista = datetime.strptime(data['data_prevista'], '%Y-%m-%d').date()
        investimento = float(data['investimento'])
    except (KeyError, ValueError, TypeError):
        return jsonify({'error': 'Dados inválidos ou formato incorreto'}), 400

    conn = connectDb()
    if not conn:
        return jsonify({'error': 'Erro ao conectar ao banco de dados'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT codigo_acao FROM tipo_acao WHERE codigo_acao = %s', (codigo_acao,))
        if not cursor.fetchone():
            return jsonify({'error': 'Tipo de ação não encontrado'}), 404
        
        cursor.execute(
            'INSERT INTO acao (codigo_acao, data_prevista, investimento, data_cadastro) VALUES (%s, %s, %s, %s)',
            (codigo_acao, data_prevista, investimento, date.today())
        )
        conn.commit()
        return jsonify({'message': 'Ação criada com sucesso!', 'id': cursor.lastrowid}), 201
    except mysql.connector.Error as e:
        return jsonify({'error': f'Erro ao criar ação: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/acoes/<int:id>', methods=['PUT'])
def update_acao(id):
    data = request.json
    if not data:
        return jsonify({'error': 'Dados inválidos'}), 400

    try:
        codigo_acao = int(data['codigo_acao'])
        data_prevista = datetime.strptime(data['data_prevista'], '%Y-%m-%d').date()
        investimento = float(data['investimento'])
    except (KeyError, ValueError, TypeError):
        return jsonify({'error': 'Dados inválidos ou formato incorreto'}), 400

    conn = connectDb()
    if not conn:
        return jsonify({'error': 'Erro ao conectar ao banco de dados'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT codigo_acao FROM tipo_acao WHERE codigo_acao = %s', (codigo_acao,))
        if not cursor.fetchone():
            return jsonify({'error': 'Tipo de ação não encontrado'}), 404
            
        cursor.execute('''
            UPDATE acao
            SET codigo_acao = %s, data_prevista = %s, investimento = %s
            WHERE id = %s
        ''', (codigo_acao, data_prevista, investimento, id))
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({'error': 'Ação não encontrada'}), 404
        return jsonify({'message': 'Ação atualizada com sucesso!'}), 200
    except mysql.connector.Error as e:
        return jsonify({'error': f'Erro ao atualizar ação: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/acoes/<int:id>', methods=['DELETE'])
def delete_acao(id):
    conn = connectDb()
    if not conn:
        return jsonify({'error': 'Erro ao conectar ao banco de dados'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM acao WHERE id = %s', (id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Ação não encontrada'}), 404
        
        return jsonify({'message': 'Ação removida com sucesso!'}), 200
    except mysql.connector.Error as e:
        return jsonify({'error': f'Erro ao excluir ação: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/tipos_acao/<int:codigo_acao>', methods=['PUT'])
def update_tipo_acao(codigo_acao):
    data = request.json
    if not data or 'nome_acao' not in data:
        return jsonify({'error': 'Dados inválidos'}), 400

    nome_acao = data['nome_acao'].strip()
    if not nome_acao:
        return jsonify({'error': 'Nome do tipo de ação não pode ser vazio'}), 400

    conn = connectDb()
    if not conn:
        return jsonify({'error': 'Erro ao conectar ao banco de dados'}), 500

    try:
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE tipo_acao
            SET nome_acao = %s
            WHERE codigo_acao = %s
        ''', (nome_acao, codigo_acao))
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({'error': 'Tipo de ação não encontrado'}), 404

        return jsonify({'message': 'Tipo de ação atualizado com sucesso!'}), 200
    except mysql.connector.Error as e:
        return jsonify({'error': f'Erro ao atualizar tipo de ação: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/tipos_acao/<int:codigo_acao>', methods=['DELETE'])
def delete_tipo_acao(codigo_acao):
    conn = connectDb()
    if not conn:
        return jsonify({'error': 'Erro ao conectar ao banco de dados'}), 500

    try:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM tipo_acao WHERE codigo_acao = %s', (codigo_acao,))
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({'error': 'Tipo de ação não encontrado'}), 404

        return jsonify({'message': 'Tipo de ação removido com sucesso!'}), 200
    except mysql.connector.Error as e:
        return jsonify({'error': f'Erro ao excluir tipo de ação: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    app.run(port=5000, debug=True)