document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('actionForm');
    const tableBody = document.getElementById('actionsTableBody');
    const clearBtn = document.getElementById('clearBtn');
    const submitBtn = form.querySelector('button[type="submit"]');
    const investmentInput = document.getElementById('investment');
    const actionDateInput = document.getElementById('actionDate');
    const actionTypeInput = document.getElementById('actionType');
    const rawInvestmentInput = document.createElement('input');
    rawInvestmentInput.type = 'hidden';
    rawInvestmentInput.id = 'rawInvestment';
    form.appendChild(rawInvestmentInput);

    let editingId = null;
    let currentData = []; 
    let currentSortColumn = null;
    let currentSortDirection = 'asc';

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
            if (index <= 2) { 
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
                    valueA = a.action_type.toLowerCase();
                    valueB = b.action_type.toLowerCase();
                    break;
                case 'Data':
                    valueA = new Date(a.action_date);
                    valueB = new Date(b.action_date);
                    break;
                case 'Investimento':
                    valueA = parseFloat(a.investment);
                    valueB = parseFloat(b.investment);
                    break;
                default:
                    return 0;
            }
            
            // Comparar valores
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
                <td>${action.action_type}</td>
                <td>${formatDate(action.action_date.split('T')[0])}</td>
                <td>R$ ${parseFloat(action.investment).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td><button class="btn-edit" onclick="editAction(${action.id}, '${action.action_type}', '${formatDate(action.action_date.split('T')[0])}', ${action.investment})">✏️</button></td>
                <td><button class="btn-delete" onclick="deleteAction(${action.id})">🗑️</button></td>
            `;
            tableBody.appendChild(row);
        });
    }

    async function fetchActions() {
        try {
            const response = await fetch('http://127.0.0.1:5000/actions');
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

    window.editAction = function(id, actionType, actionDate, investment) {
        editingId = id;
        actionTypeInput.value = actionType;
        actionDateInput.value = parseDateToInputFormat(actionDate);
        
        let investmentStr = parseFloat(investment).toFixed(2).replace('.', ',');
        investmentInput.value = investmentStr;
        
        rawInvestmentInput.value = investment;
        
        submitBtn.textContent = 'Atualizar';
    };

    window.deleteAction = async function(id) {
        if (!confirm("Tem certeza que deseja excluir esta ação?")) return;

        try {
            const response = await fetch(`http://127.0.0.1:5000/actions/${id}`, {
                method: 'DELETE',
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Erro ao excluir a ação");

            fetchActions();
        } catch (error) {
            console.error("Erro ao excluir ação:", error);
        }
    };

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const actionType = actionTypeInput.value.trim();
        const actionDate = actionDateInput.value; 
        const investment = rawInvestmentInput.value; 
    
        if (!actionType || !actionDate || !investment || isNaN(parseFloat(investment))) {
            alert("Por favor, preencha todos os campos corretamente.");
            return;
        }
        
        const selectedDate = new Date(actionDate);
        const today = new Date();
        const minDate = new Date(today);
        minDate.setDate(today.getDate() + 10);
        
        if (selectedDate < minDate) {
            alert("A data deve ser pelo menos 10 dias após a data atual.");
            return;
        }
    
        const actionData = { 
            action_type: actionType, 
            action_date: actionDate, 
            investment: parseFloat(investment) 
        };
    
        try {
            let response;
            if (editingId) {
                const originalAction = currentData.find(item => item.id === editingId);
                
                if (originalAction && 
                    originalAction.action_type === actionType && 
                    originalAction.action_date === actionDate &&
                    parseFloat(originalAction.investment) === parseFloat(investment)) {
                    
                    form.reset();
                    investmentInput.value = '';
                    rawInvestmentInput.value = '';
                    editingId = null;
                    submitBtn.textContent = 'Adicionar';
                    return; 
                }
                
                response = await fetch(`http://localhost:5000/actions/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(actionData),
                });
                editingId = null;
                submitBtn.textContent = 'Adicionar';
            } else {
                response = await fetch(`http://localhost:5000/actions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(actionData),
                });
            }
    
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Erro desconhecido");
    
            form.reset();
            investmentInput.value = '';
            rawInvestmentInput.value = '';
            fetchActions();
        } catch (error) {
            console.error("Erro ao enviar requisição:", error);
        }
    });

    clearBtn.addEventListener('click', () => {
        form.reset();
        investmentInput.value = '';
        rawInvestmentInput.value = '';
        editingId = null;
        submitBtn.textContent = 'Adicionar';
    });

    fetchActions();
});
