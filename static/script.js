document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('actionForm');
    const tableBody = document.getElementById('actionsTableBody');
    const clearBtn = document.getElementById('clearBtn');
    const submitBtn = form.querySelector('button[type="submit"]');
    const investmentInput = document.getElementById('investment');
    const actionDateInput = document.getElementById('actionDate');
    const actionTypeInput = document.getElementById('actionType');
    const tipoAcaoForm = document.getElementById('tipoAcaoForm');
    const btnSalvarTipoAcao = document.getElementById('btnSalvarTipoAcao');
    const btnGerenciarTiposAcao = document.getElementById('btnGerenciarTiposAcao');
    const tiposAcaoTableBody = document.getElementById('tiposAcaoTableBody');
    const btnSalvarEditarTipoAcao = document.getElementById('btnSalvarEditarTipoAcao');
    const rawInvestmentInput = document.createElement('input');
    rawInvestmentInput.type = 'hidden';
    rawInvestmentInput.id = 'rawInvestment';
    form.appendChild(rawInvestmentInput);

    let editingId = null;
    let currentData = []; 
    let currentSortColumn = null;
    let currentSortDirection = 'asc';
    let tiposAcao = [];

    function setMinDate() {
        const today = new Date();
        const minDate = new Date(today);
        minDate.setDate(today.getDate() + 10);
        
        const formattedMinDate = minDate.toISOString().split('T')[0];
        actionDateInput.min = formattedMinDate;
        
        actionDateInput.title = "A data deve ser pelo menos 10 dias após a data atual";
    }

    setMinDate();

    function formatCurrency(value) {
        let number = value.replace(/\D/g, '');
        number = parseInt(number, 10);
        if (isNaN(number) || number.toString().length === 0) return '0,00';
        number = number.toString();

        let intPart = number.slice(0, -2) || '0';
        let decimalPart = number.slice(-2).padStart(2, '0');
        intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

        return `${intPart},${decimalPart}`;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }

    function parseDateToInputFormat(dateStr) {
        if (!dateStr) return '';
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month}-${day}`;
    }

    actionDateInput.addEventListener('change', (event) => {
        const selectedDate = new Date(event.target.value);
        const today = new Date();
        
        const minDate = new Date(today);
        minDate.setDate(today.getDate() + 10);
        
        if (selectedDate < minDate) {
            alert("A data deve ser pelo menos 10 dias após a data atual.");
            event.target.value = '';
        }
    });

    investmentInput.addEventListener('input', (event) => {
        let formattedValue = formatCurrency(event.target.value);
        event.target.value = formattedValue;
        
        let numericValue = parseFloat(event.target.value.replace(/\./g, '').replace(',', '.'));
        
        if (isNaN(numericValue)) {
            rawInvestmentInput.value = "";
        } else {
            rawInvestmentInput.value = numericValue.toFixed(2);
        }
    });

    function setupSortingListeners() {
        const headers = document.querySelectorAll('table th');
        
        headers.forEach((header, index) => {
            if (index <= 3) { 
                header.addEventListener('click', () => {
                    const columnName = header.textContent.trim().split(' ')[0]; 
                    sortTable(columnName, index);
                });
            }
        });
    }

    function sortTable(columnName, columnIndex) {
        if (currentSortColumn === columnName) {
            currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortColumn = columnName;
            currentSortDirection = 'asc';
        }
        
        updateSortIcons(columnIndex);
        
        sortData(columnName, currentSortDirection);
    }

    function updateSortIcons(activeColumnIndex) {
        const headers = document.querySelectorAll('table th i.fas');
        
        headers.forEach((icon, index) => {
            icon.classList.remove('fa-sort-up', 'fa-sort-down');
            icon.classList.add('fa-sort');
            
            if (index === activeColumnIndex) {
                icon.classList.remove('fa-sort');
                if (currentSortDirection === 'asc') {
                    icon.classList.add('fa-sort-up');
                } else {
                    icon.classList.add('fa-sort-down');
                }
            }
        });
    }

    function sortData(columnName, direction) {
        const dataCopy = [...currentData];
        
        dataCopy.sort((a, b) => {
            let valueA, valueB;
            
            switch (columnName) {
                case 'Ação':
                    valueA = a.nome_acao.toLowerCase();
                    valueB = b.nome_acao.toLowerCase();
                    break;
                case 'Data':
                    valueA = new Date(a.data_prevista);
                    valueB = new Date(b.data_prevista);
                    break;
                case 'Investimento':
                    valueA = parseFloat(a.investimento);
                    valueB = parseFloat(b.investimento);
                    break;
                case 'Data':
                    if (columnName === 'Data de cadastro') {
                        valueA = new Date(a.data_cadastro);
                        valueB = new Date(b.data_cadastro);
                    } else {
                        valueA = new Date(a.data_prevista);
                        valueB = new Date(b.data_prevista);
                    }
                    break;
                default:
                    return 0;
            }
            
            if (valueA < valueB) {
                return direction === 'asc' ? -1 : 1;
            }
            if (valueA > valueB) {
                return direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
        
        renderTableData(dataCopy);
    }

    function renderTableData(data) {
        tableBody.innerHTML = '';
        
        data.forEach(action => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${action.nome_acao}</td>
                <td>${formatDate(action.data_prevista)}</td>
                <td>R$ ${parseFloat(action.investimento).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td>${formatDate(action.data_cadastro)}</td>
                <td><button class="btn-edit" onclick="editAction(${action.id}, ${action.codigo_acao}, '${action.data_prevista}', ${action.investimento})">✏️</button></td>
                <td><button class="btn-delete" onclick="deleteAction(${action.id})">🗑️</button></td>
            `;
            tableBody.appendChild(row);
        });
    }

    function renderTiposAcaoTable(data) {
        tiposAcaoTableBody.innerHTML = '';
        
        data.forEach(tipo => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${tipo.codigo_acao}</td>
                <td>${tipo.nome_acao}</td>
                <td class="text-center"><button class="btn-edit" onclick="editTipoAcao(${tipo.codigo_acao}, '${tipo.nome_acao}')">✏️</button></td>
                <td class="text-center"><button class="btn-delete" onclick="deleteTipoAcao(${tipo.codigo_acao})">🗑️</button></td>
            `;
            tiposAcaoTableBody.appendChild(row);
        });
    }

    async function fetchTiposAcao() {
        try {
            const response = await fetch('http://127.0.0.1:5000/tipos_acao');
            const data = await response.json();
            
            if (!Array.isArray(data)) {
                console.error("Erro: resposta inesperada da API", data);
                return;
            }
            
            tiposAcao = [...data];
            
            const actionTypeSelect = document.getElementById('actionType');
            while (actionTypeSelect.options.length > 1) {
                actionTypeSelect.remove(1);
            }
            
            data.forEach(tipo => {
                const option = document.createElement('option');
                option.value = tipo.codigo_acao;
                option.textContent = tipo.nome_acao;
                actionTypeSelect.appendChild(option);
            });
            
        } catch (error) {
            console.error("Erro ao buscar tipos de ação:", error);
        }
    }

    async function fetchActions() {
        try {
            const response = await fetch('http://127.0.0.1:5000/acoes');
            const data = await response.json();
    
            if (!Array.isArray(data)) {
                console.error("Erro: resposta inesperada da API", data);
                return;
            }
    
            currentData = [...data];
            renderTableData(currentData);
            setupSortingListeners();
    
        } catch (error) {
            console.error("Erro ao buscar ações:", error);
        }
    }

    async function tipoAcaoEmUso(codigoAcao) {
        try {
            const response = await fetch('http://127.0.0.1:5000/acoes');
            const acoes = await response.json();
            
            return acoes.some(acao => acao.codigo_acao === codigoAcao);
        } catch (error) {
            console.error("Erro ao verificar uso do tipo de ação:", error);
            return false;
        }
    }

    window.editAction = function(id, codigoAcao, dataPrevista, investimento) {
        editingId = id;
        actionTypeInput.value = codigoAcao;
        actionDateInput.value = dataPrevista; 
        
        let investmentStr = parseFloat(investimento).toFixed(2).replace('.', ',');
        investmentInput.value = formatCurrency(investmentStr);
        
        rawInvestmentInput.value = investimento;
        
        submitBtn.textContent = 'Atualizar';
    };

    window.deleteAction = async function(id) {
        if (!confirm("Tem certeza que deseja excluir esta ação?")) return;

        try {
            const response = await fetch(`http://127.0.0.1:5000/acoes/${id}`, {
                method: 'DELETE',
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Erro ao excluir a ação");
            
            alert(result.message);
            fetchActions();
        } catch (error) {
            console.error("Erro ao excluir ação:", error);
            alert("Erro ao excluir a ação: " + error.message);
        }
    };

    window.editTipoAcao = function(codigoAcao, nomeAcao) {
        document.getElementById('editarCodigoTipoAcao').value = codigoAcao;
        document.getElementById('editarNomeTipoAcao').value = nomeAcao;
        
        const modalGerenciar = bootstrap.Modal.getInstance(document.getElementById('modalGerenciarTiposAcao'));
        modalGerenciar.hide();
        
        const modalEditar = new bootstrap.Modal(document.getElementById('modalEditarTipoAcao'));
        modalEditar.show();
    };

    window.deleteTipoAcao = async function(codigoAcao) {
        const emUso = await tipoAcaoEmUso(codigoAcao);
        if (emUso) {
            alert("Este tipo de ação não pode ser excluído porque está sendo usado em uma ou mais ações.");
            return;
        }
        
        if (!confirm("Tem certeza que deseja excluir este tipo de ação?")) return;

        try {
            const response = await fetch(`http://127.0.0.1:5000/tipos_acao/${codigoAcao}`, {
                method: 'DELETE',
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Erro ao excluir o tipo de ação");
            
            alert(result.message);
            await fetchTiposAcao();
            renderTiposAcaoTable(tiposAcao);
        } catch (error) {
            console.error("Erro ao excluir tipo de ação:", error);
            alert("Erro ao excluir o tipo de ação: " + error.message);
        }
    };

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const codigo_acao = actionTypeInput.value;
        const data_prevista = actionDateInput.value; 
        const investimento = rawInvestmentInput.value; 
    
        if (!codigo_acao || !data_prevista || !investimento || isNaN(parseFloat(investimento))) {
            alert("Por favor, preencha todos os campos corretamente.");
            return;
        }
        
        const selectedDate = new Date(data_prevista);
        const today = new Date();
        const minDate = new Date(today);
        minDate.setDate(today.getDate() + 10);
        
        if (selectedDate < minDate) {
            alert("A data deve ser pelo menos 10 dias após a data atual.");
            return;
        }
    
        const actionData = { 
            codigo_acao: parseInt(codigo_acao), 
            data_prevista: data_prevista, 
            investimento: parseFloat(investimento) 
        };
    
        try {
            let response;
            if (editingId) {
                response = await fetch(`http://localhost:5000/acoes/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(actionData),
                });
                editingId = null;
                submitBtn.textContent = 'Adicionar';
            } else {
                response = await fetch(`http://localhost:5000/acoes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(actionData),
                });
            }
    
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Erro desconhecido");
    
            alert(result.message);
            form.reset();
            investmentInput.value = '';
            rawInvestmentInput.value = '';
            fetchActions();
        } catch (error) {
            console.error("Erro ao enviar requisição:", error);
            alert("Erro: " + error.message);
        }
    });

    btnSalvarTipoAcao.addEventListener('click', async () => {
        const nomeTipoAcao = document.getElementById('nomeTipoAcao').value.trim();
        
        if (!nomeTipoAcao) {
            alert("Por favor, informe um nome para o tipo de ação");
            return;
        }
        
        try {
            const response = await fetch('http://127.0.0.1:5000/tipos_acao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome_acao: nomeTipoAcao }),
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Erro desconhecido");
            
            alert(result.message);
            document.getElementById('nomeTipoAcao').value = '';
            
            const modalEl = document.getElementById('modalTipoAcao');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
            
            fetchTiposAcao();
        } catch (error) {
            console.error("Erro ao adicionar tipo de ação:", error);
            alert("Erro: " + error.message);
        }
    });

    btnSalvarEditarTipoAcao.addEventListener('click', async () => {
        const codigoTipoAcao = document.getElementById('editarCodigoTipoAcao').value;
        const nomeTipoAcao = document.getElementById('editarNomeTipoAcao').value.trim();
        
        if (!nomeTipoAcao) {
            alert("Por favor, informe um nome para o tipo de ação");
            return;
        }
        
        try {
            const response = await fetch(`http://127.0.0.1:5000/tipos_acao/${codigoTipoAcao}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome_acao: nomeTipoAcao }),
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Erro desconhecido");
            
            alert(result.message);
            
            const modalEl = document.getElementById('modalEditarTipoAcao');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
            
            await fetchTiposAcao();
            
            const modalGerenciar = new bootstrap.Modal(document.getElementById('modalGerenciarTiposAcao'));
            modalGerenciar.show();
            
            renderTiposAcaoTable(tiposAcao);
        } catch (error) {
            console.error("Erro ao editar tipo de ação:", error);
            alert("Erro: " + error.message);
        }
    });

    btnGerenciarTiposAcao.addEventListener('click', async () => {
        await fetchTiposAcao();
        renderTiposAcaoTable(tiposAcao);
    });

    clearBtn.addEventListener('click', () => {
        form.reset();
        investmentInput.value = '';
        rawInvestmentInput.value = '';
        editingId = null;
        submitBtn.textContent = 'Adicionar';
    });

    fetchTiposAcao();
    fetchActions();
});