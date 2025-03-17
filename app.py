from flask import Flask, request, render_template, jsonify
from flask_cors import CORS
import mysql.connector
from datetime import datetime

app = Flask(__name__)
CORS(app, resources={r"/actions/*": {"origins": "*"}})

db_config = {
    'host': 'localhost',
    'user': 'seu-usuario',
    'password': 'sua-senha',
    'database': 'marketing_db'
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

def create_table():
    """Cria a tabela 'actions' caso ainda não exista."""
    conn = connectDb()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS actions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    action_type VARCHAR(255) NOT NULL,
                    action_date DATE NOT NULL,
                    investment DECIMAL(10, 2) NOT NULL
                )
            ''')
            conn.commit()
            print("Tabela 'actions' verificada/criada com sucesso.")
        except mysql.connector.Error as e:
            print(f"Erro ao criar tabela: {e}")
        finally:
            cursor.close()
            conn.close()

create_database()
create_table()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/actions', methods=['GET'])
def get_actions():
    conn = connectDb()
    if not conn:
        return jsonify({'error': 'Erro ao conectar ao banco de dados'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT * FROM actions')
        actions = cursor.fetchall()
        for action in actions:
            action['action_date'] = action['action_date'].strftime('%Y-%m-%d')
        return jsonify(actions), 200
    except mysql.connector.Error as e:
        return jsonify({'error': f'Erro ao buscar ações: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/actions', methods=['POST'])
def add_action():
    data = request.json
    if not data:
        return jsonify({'error': 'Nenhum dado recebido'}), 400

    try:
        action_type = data['action_type']
        action_date = datetime.strptime(data['action_date'], '%Y-%m-%d').date()
        investment = float(data['investment'])
    except (KeyError, ValueError):
        return jsonify({'error': 'Dados inválidos ou formato incorreto'}), 400

    conn = connectDb()
    if not conn:
        return jsonify({'error': 'Erro ao conectar ao banco de dados'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO actions (action_type, action_date, investment) VALUES (%s, %s, %s)',
            (action_type, action_date, investment)
        )
        conn.commit()
        return jsonify({'message': 'Ação criada com sucesso!'}), 201
    finally:
        cursor.close()
        conn.close()

@app.route('/actions/<int:id>', methods=['PUT'])
def update_action(id):
    data = request.json
    if not data or not all(key in data for key in ('action_type', 'action_date', 'investment')):
        return jsonify({'error': 'Dados inválidos'}), 400

    try:
        action_type = data['action_type']
        action_date = datetime.strptime(data['action_date'], '%Y-%m-%d').date()
        investment = float(data['investment'])
    except ValueError:
        return jsonify({'error': 'Formato de dados inválido'}), 400

    conn = connectDb()
    if not conn:
        return jsonify({'error': 'Erro ao conectar ao banco de dados'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE actions
            SET action_type = %s, action_date = %s, investment = %s
            WHERE id = %s
        ''', (action_type, action_date, investment, id))
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({'error': 'Ação não encontrada'}), 404
        return jsonify({'message': 'Ação atualizada com sucesso!'}), 200
    except mysql.connector.Error as e:
        return jsonify({'error': f'Erro ao atualizar ação: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/actions/<int:id>', methods=['DELETE'])
def delete_action(id):
    conn = connectDb()
    if not conn:
        return jsonify({'error': 'Erro ao conectar ao banco de dados'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM actions WHERE id = %s', (id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Ação não encontrada'}), 404
        
        cursor.execute('SELECT MAX(id) FROM actions')
        max_id = cursor.fetchone()[0] or 0
        
        cursor.execute(f'ALTER TABLE actions AUTO_INCREMENT = {max_id + 1}')
        conn.commit()
        
        return jsonify({'message': 'Ação removida com sucesso!'}), 200
    except mysql.connector.Error as e:
        return jsonify({'error': f'Erro ao excluir ação: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    app.run(port=5000, debug=True)
