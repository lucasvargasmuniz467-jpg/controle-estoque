/* ====== Dados (LocalStorage) ====== */
const USUARIO = "admin";
const SENHA = "1234";

const lerProdutos = () => JSON.parse(localStorage.getItem("produtos") || "[]");
const salvarProdutos = (lista) => localStorage.setItem("produtos", JSON.stringify(lista));
const lerHistorico = () => JSON.parse(localStorage.getItem("historico") || "[]");
const salvarHistorico = (lista) => localStorage.setItem("historico", JSON.stringify(lista));

const $ = (id) => document.getElementById(id);
const dinheiro = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const limpar = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const estoqueBaixo = (p) => p.quantidade <= p.minimo;

/* ====== Login (RF01) ====== */
function entrar() {
  $("tela-login").hidden = true;
  $("app").hidden = false;
  mostrarTela("dashboard");
}

$("form-login").addEventListener("submit", (e) => {
  e.preventDefault();
  if ($("login-usuario").value.trim() === USUARIO && $("login-senha").value === SENHA) {
    sessionStorage.setItem("logado", "sim");
    $("login-erro").hidden = true;
    entrar();
  } else {
    $("login-erro").hidden = false;
  }
});

$("btn-sair").addEventListener("click", () => {
  sessionStorage.removeItem("logado");
  location.reload();
});

/* ====== Navegação ====== */
function mostrarTela(nome) {
  document.querySelectorAll(".tela").forEach((t) => (t.hidden = t.id !== nome));
  document.querySelectorAll(".topo nav button[data-tela]").forEach((b) =>
    b.classList.toggle("ativo", b.dataset.tela === nome)
  );
  if (nome === "dashboard") desenharDashboard();
  if (nome === "lista") desenharLista();
  if (nome === "movimentacao") desenharMovimentacao();
  if (nome === "cadastro" && !$("p-id").value) $("titulo-cadastro").textContent = "Cadastrar produto";
  atualizarAviso();
}

document.querySelectorAll(".topo nav button[data-tela]").forEach((b) =>
  b.addEventListener("click", () => {
    if (b.dataset.tela !== "cadastro") cancelarEdicao();
    mostrarTela(b.dataset.tela);
  })
);

/* ====== Alerta de estoque baixo (RF08) ====== */
function atualizarAviso() {
  const baixos = lerProdutos().filter(estoqueBaixo);
  const aviso = $("aviso");
  aviso.hidden = baixos.length === 0;
  if (baixos.length) {
    aviso.textContent = `Atenção: ${baixos.length} produto(s) com estoque baixo — ${baixos.map((p) => p.nome).join(", ")}.`;
  }
}

/* ====== Dashboard ====== */
function desenharDashboard() {
  const produtos = lerProdutos();
  const baixos = produtos.filter(estoqueBaixo);
  $("n-produtos").textContent = produtos.length;
  $("n-unidades").textContent = produtos.reduce((s, p) => s + p.quantidade, 0);
  $("n-baixo").textContent = baixos.length;
  $("lista-baixo").innerHTML = baixos.length
    ? baixos.map((p) => `<li class="baixo"><b>${limpar(p.nome)}</b> — ${p.quantidade} un. (mínimo ${p.minimo})</li>`).join("")
    : `<li>Nenhum item com estoque baixo.</li>`;
}

/* ====== Cadastro e edição (RF02, RF04) ====== */
$("form-produto").addEventListener("submit", (e) => {
  e.preventDefault();
  const produtos = lerProdutos();
  const dados = {
    nome: $("p-nome").value.trim(),
    categoria: $("p-categoria").value.trim(),
    preco: parseFloat($("p-preco").value),
    quantidade: parseInt($("p-qtd").value, 10),
    minimo: parseInt($("p-min").value, 10),
  };
  const id = $("p-id").value;
  if (id) {
    const i = produtos.findIndex((p) => p.id === id);
    produtos[i] = { ...produtos[i], ...dados };
  } else {
    produtos.push({ id: String(Date.now()), ...dados });
  }
  salvarProdutos(produtos);
  cancelarEdicao();
  mostrarTela("lista");
});

function cancelarEdicao() {
  $("form-produto").reset();
  $("p-id").value = "";
  $("p-min").value = 5;
  $("btn-cancelar").hidden = true;
}
$("btn-cancelar").addEventListener("click", () => { cancelarEdicao(); mostrarTela("lista"); });

function editarProduto(id) {
  const p = lerProdutos().find((x) => x.id === id);
  $("p-id").value = p.id;
  $("p-nome").value = p.nome;
  $("p-categoria").value = p.categoria;
  $("p-preco").value = p.preco;
  $("p-qtd").value = p.quantidade;
  $("p-min").value = p.minimo;
  $("titulo-cadastro").textContent = "Editar produto";
  $("btn-cancelar").hidden = false;
  mostrarTela("cadastro");
  $("titulo-cadastro").textContent = "Editar produto";
}

/* ====== Lista e exclusão (RF03, RF05) ====== */
function desenharLista() {
  const termo = $("busca").value.toLowerCase();
  const produtos = lerProdutos().filter(
    (p) => p.nome.toLowerCase().includes(termo) || p.categoria.toLowerCase().includes(termo)
  );
  $("vazio").hidden = lerProdutos().length > 0;
  $("tabela").innerHTML = produtos
    .map(
      (p) => `<tr>
        <td>${limpar(p.nome)}</td>
        <td>${limpar(p.categoria)}</td>
        <td>${dinheiro(p.preco)}</td>
        <td>${p.quantidade}${estoqueBaixo(p) ? '<span class="tag">baixo</span>' : ""}</td>
        <td>
          <button class="mini" data-editar="${p.id}">Editar</button>
          <button class="mini excluir" data-excluir="${p.id}">Excluir</button>
        </td>
      </tr>`
    )
    .join("");
}
$("busca").addEventListener("input", desenharLista);

$("tabela").addEventListener("click", (e) => {
  const ed = e.target.dataset.editar;
  const ex = e.target.dataset.excluir;
  if (ed) editarProduto(ed);
  if (ex && confirm("Excluir este produto? Essa ação não pode ser desfeita.")) {
    salvarProdutos(lerProdutos().filter((p) => p.id !== ex));
    desenharLista();
    atualizarAviso();
  }
});

/* ====== Movimentação (RF06, RF07) ====== */
function desenharMovimentacao() {
  const produtos = lerProdutos();
  $("m-produto").innerHTML = produtos.length
    ? produtos.map((p) => `<option value="${p.id}">${limpar(p.nome)} (${p.quantidade} un.)</option>`).join("")
    : `<option value="">Cadastre um produto primeiro</option>`;
  $("historico").innerHTML = lerHistorico().slice(0, 10)
    .map((h) => `<li><b>${h.tipo === "entrada" ? "Entrada" : "Saída"}</b> de ${h.qtd} un. — ${limpar(h.nome)} <span class="muted">(${h.data})</span></li>`)
    .join("") || `<li>Nenhuma movimentação registrada.</li>`;
}

$("form-mov").addEventListener("submit", (e) => {
  e.preventDefault();
  const produtos = lerProdutos();
  const p = produtos.find((x) => x.id === $("m-produto").value);
  const tipo = $("m-tipo").value;
  const qtd = parseInt($("m-qtd").value, 10);
  const erro = $("m-erro");
  if (!p) { erro.textContent = "Escolha um produto."; erro.hidden = false; return; }
  if (tipo === "saida" && qtd > p.quantidade) {
    erro.textContent = `Só há ${p.quantidade} unidade(s) de ${p.nome} em estoque.`;
    erro.hidden = false;
    return;
  }
  erro.hidden = true;
  p.quantidade += tipo === "entrada" ? qtd : -qtd;
  salvarProdutos(produtos);
  const historico = lerHistorico();
  historico.unshift({ nome: p.nome, tipo, qtd, data: new Date().toLocaleString("pt-BR") });
  salvarHistorico(historico);
  $("m-qtd").value = "";
  desenharMovimentacao();
  atualizarAviso();
});

/* ====== Início ====== */
if (sessionStorage.getItem("logado") === "sim") entrar();
