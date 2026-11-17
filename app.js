const books = [
  {id:1,title:"O Poder da Leitura",author:"84 Books Publishing",category:"Desenvolvimento pessoal",type:"gratuito",price:"Grátis",tone:"tone-one",status:"Disponível",excerpt:"A leitura é uma das ferramentas mais poderosas para transformar a maneira como vemos o mundo. Cada página oferece uma oportunidade de aprender, questionar e crescer.\n\nLer não é apenas reconhecer palavras: é construir ideias, desenvolver a imaginação e descobrir caminhos que antes pareciam impossíveis.\n\nNa 84 Books Publishing, acreditamos que o conhecimento deve circular e alcançar pessoas de diferentes lugares."},
  {id:2,title:"Caminhos da Coragem",author:"84 Books Publishing",category:"Motivação",type:"pago",price:"Em breve",tone:"tone-two",status:"Disponível",excerpt:"A coragem não significa ausência de medo. Significa encontrar uma razão para continuar, mesmo quando o caminho exige esforço.\n\nEste livro fará parte do catálogo oficial da editora. A versão completa e as informações de compra serão anunciadas quando a publicação estiver pronta."},
  {id:3,title:"Pequenas Grandes Ideias",author:"84 Books Publishing",category:"Conhecimento",type:"gratuito",price:"Grátis",tone:"tone-three",status:"Disponível",excerpt:"Uma ideia pode começar pequena e, com dedicação, transformar-se em algo extraordinário. O conhecimento cresce quando é partilhado.\n\nEste espaço de leitura apresenta uma pequena amostra do tipo de conteúdo que a 84 Books Publishing pretende oferecer aos seus leitores."},
  {id:4,title:"O Futuro Começa Hoje",author:"84 Books Publishing",category:"Educação",type:"breve",price:"Em preparação",tone:"tone-four",status:"Em preparação",excerpt:"Este título está em preparação pela equipa editorial. Em breve, esta página apresentará a descrição, os detalhes da publicação e a data prevista de lançamento."},
  {id:5,title:"Além das Fronteiras",author:"84 Books Publishing",category:"Literatura",type:"pago",price:"Em breve",tone:"tone-five",status:"Disponível",excerpt:"Histórias atravessam fronteiras, aproximam culturas e mostram que a experiência humana tem muitas vozes.\n\nA publicação está a ser preparada. Os detalhes da edição e o acesso integral serão anunciados em breve."},
  {id:6,title:"Aprender Sempre",author:"84 Books Publishing",category:"Educação",type:"gratuito",price:"Grátis",tone:"tone-six",status:"Disponível",excerpt:"Aprender é um processo que acompanha toda a vida. A curiosidade ajuda-nos a fazer perguntas melhores e a encontrar respostas mais completas.\n\nEste pequeno texto é uma demonstração do leitor digital da 84 Books Publishing."}
];
const favorites = new Set(JSON.parse(localStorage.getItem("84books-favorites") || "[]"));
let activeFilter = "todos";
const grid = document.getElementById("bookGrid");
const search = document.getElementById("searchInput");
const empty = document.getElementById("emptyState");

function renderBooks(){
  const term = search.value.trim().toLocaleLowerCase("pt");
  const visible = books.filter(book => {
    const matchesText = (book.title+" "+book.author+" "+book.category).toLocaleLowerCase("pt").includes(term);
    const matchesFilter = activeFilter === "todos" ||
      (activeFilter === "favoritos" && favorites.has(book.id)) ||
      (activeFilter !== "favoritos" && book.type === activeFilter);
    return matchesText && matchesFilter;
  });
  grid.innerHTML = visible.map(book => {
    const tag = book.type === "gratuito" ? '<span class="status-tag">Gratuito</span>' :
      book.type === "pago" ? '<span class="status-tag paid">Pago</span>' : '<span class="status-tag">Em breve</span>';
    const buttonText = book.type === "breve" ? "Em preparação" : "Ver prévia →";
    return `<article class="book-card">
      <div class="cover-wrap">
        <div class="cover-art ${book.tone}"><small>84 BOOKS PUBLISHING</small><strong>${book.title}</strong><span class="cover-number">84</span><small>CONHECIMENTO SEM FRONTEIRAS</small></div>
        ${tag}
        <button class="favorite-btn ${favorites.has(book.id) ? "is-favorite" : ""}" data-favorite="${book.id}" aria-label="${favorites.has(book.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}">${favorites.has(book.id) ? "♥" : "♡"}</button>
      </div>
      <div class="book-info"><span class="book-category">${book.category}</span><h3>${book.title}</h3><p class="book-author">Por ${book.author}</p><div class="book-bottom"><span class="book-price">${book.price}</span><button class="book-open" data-open="${book.id}" ${book.type === "breve" ? "disabled" : ""}>${buttonText}</button></div></div>
    </article>`;
  }).join("");
  empty.hidden = visible.length !== 0;
}
document.getElementById("filterList").addEventListener("click", event => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll(".filter-chip").forEach(chip => chip.classList.toggle("selected", chip === button));
  renderBooks();
});
search.addEventListener("input", renderBooks);
grid.addEventListener("click", event => {
  const favoriteButton = event.target.closest("[data-favorite]");
  if (favoriteButton) {
    const id = Number(favoriteButton.dataset.favorite);
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    localStorage.setItem("84books-favorites", JSON.stringify([...favorites]));
    renderBooks();
    return;
  }
  const openButton = event.target.closest("[data-open]");
  if (openButton) openReader(Number(openButton.dataset.open));
});
function openReader(id){
  const book = books.find(item => item.id === id);
  if (!book || book.type === "breve") return;
  document.getElementById("readerTitle").textContent = book.title;
  document.getElementById("readerAuthor").textContent = "Por " + book.author + " · " + book.category;
  document.getElementById("readerContent").textContent = book.excerpt;
  const overlay = document.getElementById("readerOverlay");
  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
}
function closeReader(){
  const overlay = document.getElementById("readerOverlay");
  overlay.classList.remove("open");
  overlay.setAttribute("aria-hidden","true");
  document.body.style.overflow = "";
}
document.getElementById("closeReader").addEventListener("click", closeReader);
document.getElementById("readerOverlay").addEventListener("click", event => {
  if (event.target.id === "readerOverlay") closeReader();
});
document.addEventListener("keydown", event => { if (event.key === "Escape") closeReader(); });
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
menuToggle.addEventListener("click", () => {
  const open = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(open));
});
mainNav.addEventListener("click", event => {
  if (event.target.closest("a")) {
    mainNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded","false");
  }
});
document.getElementById("year").textContent = new Date().getFullYear();
renderBooks();

// Alternância de tema: guarda a preferência neste dispositivo.
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const themeLabel = document.getElementById("themeLabel");
function applyTheme(theme){
  document.body.dataset.theme = theme;
  const light = theme === "light";
  themeIcon.textContent = light ? "☾" : "☀";
  themeLabel.textContent = light ? "Modo escuro" : "Modo claro";
  themeToggle.setAttribute("aria-label", light ? "Ativar modo escuro" : "Ativar modo claro");
  document.querySelector('meta[name="theme-color"]').setAttribute("content", light ? "#fffdfa" : "#090b11");
}
const savedTheme = localStorage.getItem("84books-theme");
applyTheme(savedTheme === "light" ? "light" : "dark");
themeToggle.addEventListener("click", () => {
  const next = document.body.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("84books-theme", next);
  applyTheme(next);
});
