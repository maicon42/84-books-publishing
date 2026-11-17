const demoBooks = [];
let books = [...demoBooks];
function readSavedList(key){
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch(error) {
    return [];
  }
}
function savePreference(key,value){
  try { localStorage.setItem(key,value); } catch(error) {}
}
const favorites = new Set(readSavedList("84books-favorites"));
let activeFilter = "todos";
let activeCategory = "todos";
let catalogLoadError = false;
const grid = document.getElementById("bookGrid");
const search = document.getElementById("searchInput");
const empty = document.getElementById("emptyState");
const genreFilterList = document.getElementById("genreFilterList");

function bookKey(id){return typeof id==="number"?id:String(id);}
function parseBookId(value){return /^\d+$/.test(String(value))?Number(value):String(value);}
function bookPriceLabel(book){if(typeof book.price==="string")return book.price;if(book.type==="gratuito")return "Grátis";if(book.type==="pago")return Number(book.price)>0?Number(book.price).toLocaleString("pt-AO")+" Kz":"Pago";return "Em preparação";}
function hideFirstWelcome(){
  const panel=document.getElementById("homeWelcomePanel");
  if(panel)panel.hidden=true;
}
function renderHomeGreeting(name){
  const greeting=document.getElementById("homeGreeting");
  if(!greeting)return;
  const user=current84User;
  const metadataName=user&&user.user_metadata&&user.user_metadata.full_name;
  const displayName=String(name||metadataName||(user&&user.email||"").split("@")[0]||"leitor").trim();
  greeting.textContent="Seja bem-vindo, "+displayName+"!";
}

function renderHomeBookCard(book){
  const cover=book.coverUrl
    ?'<img src="'+escapeHTML(book.coverUrl)+'" alt="Capa de '+escapeHTML(book.title)+'" loading="lazy">'
    :'<div class="home-cover-fallback"><small>84 BOOKS PUBLISHING</small><strong>'+escapeHTML(book.title)+'</strong><span>84</span></div>';
  return '<a class="home-book-card" href="#/livro/'+encodeURIComponent(book.id)+'">'+
    '<span class="home-book-cover">'+cover+'</span>'+
    '<span class="home-book-category">'+escapeHTML(book.category||"Geral")+'</span>'+
    '<strong>'+escapeHTML(book.title)+'</strong>'+
    '<small>'+escapeHTML(book.author||"84 Books Publishing")+'</small>'+
    '<span class="home-book-link">Conhecer livro →</span>'+
  '</a>';
}
function renderHome(){
  const latestContainer=document.getElementById("homeLatestBooks");
  if(!latestContainer)return;
  const latest=books.filter(book=>book.isRemote&&book.status==="published")
    .sort((a,b)=>new Date(b.createdAt||0).getTime()-new Date(a.createdAt||0).getTime())
    .slice(0,4);
  latestContainer.innerHTML=latest.length
    ?latest.map(renderHomeBookCard).join("")
    :'<p class="home-empty">Ainda não há novos livros publicados. Quando a equipa lançar uma obra, ela aparecerá aqui.</p>';
}

function normalizeBookText(value){
  return String(value||"").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLocaleLowerCase("pt").trim();
}
const bookGenres=[
  ["Religiosos","Religioso"],["Bíblicos","Bíblico"],["Cristãos","Cristão"],
  ["Romance","Romance"],["Drama","Drama"],["Ação","Ação"],["Aventura","Aventura"],
  ["Suspense","Suspense"],["Terror","Terror"],["Mistério","Mistério"],
  ["Fantasia","Fantasia"],["Ficção científica","Ficção científica"],
  ["Biografia","Biografia"],["História","História"],["História de Angola","História de Angola"],
  ["Educação","Educação"],["Poesia","Poesia"],["Contos","Contos"],["Crónicas","Crónica"],
  ["Literatura clássica","Literatura clássica"],["Policial","Policial"],["Guerra","Guerra"],
  ["Autoajuda","Autoajuda"],["Desenvolvimento pessoal","Desenvolvimento pessoal"],
  ["Psicologia","Psicologia"],["Filosofia","Filosofia"],["Sociologia","Sociologia"],
  ["Direito","Direito"],["Economia","Economia"],["Negócios e empreendedorismo","Empreendedorismo"],
  ["Ciência","Ciência"],["Tecnologia","Tecnologia"],["Infantil","Infantil"],
  ["Juvenil","Juvenil"],["Quadrinhos e mangá","Mangá"],["Saúde e bem-estar","Saúde"],
  ["Viagem e cultura","Viagem"],["Culinária","Culinária"],["Política e sociedade","Política"],
  ["Teatro","Teatro"],["Geografia","Geografia"],["Desporto","Desporto"]
];
function renderGenreFilters(){
  if(!genreFilterList)return;
  const known=new Set(bookGenres.map(item=>normalizeBookText(item[1])));
  const extras=[...new Set(books.map(book=>String(book.category||"").trim()).filter(Boolean))]
    .filter(category=>!known.has(normalizeBookText(category)))
    .sort((a,b)=>a.localeCompare(b,"pt"));
  const options=[["Todos os géneros","todos"],...bookGenres,...extras.map(category=>[category,category])];
  genreFilterList.innerHTML=options.map(item=>'<button type="button" class="filter-chip '+(normalizeBookText(activeCategory)===normalizeBookText(item[1])?"selected":"")+'" data-genre-filter="'+escapeHTML(item[1])+'">'+escapeHTML(item[0])+'</button>').join("");
}
function updateGenreFilterSelection(){
  if(!genreFilterList)return;
  genreFilterList.querySelectorAll("[data-genre-filter]").forEach(button=>{
    button.classList.toggle("selected",normalizeBookText(button.dataset.genreFilter)===normalizeBookText(activeCategory));
  });
}
function renderBooks(){
  const term = normalizeBookText(search.value);
  const visible = books.filter(book => {
    const searchable=[book.title,book.author,book.category,book.description,book.previewText,book.excerpt].join(" ");
    const matchesText = normalizeBookText(searchable).includes(term);
    const matchesFilter = activeFilter === "todos" ||
      (activeFilter === "favoritos" && favorites.has(bookKey(book.id))) ||
      (activeFilter !== "favoritos" && book.type === activeFilter);
    const categoryText=normalizeBookText(book.category);
    const selectedGenre=normalizeBookText(activeCategory);
    const matchesCategory=activeCategory==="todos"||categoryText.includes(selectedGenre);
    return matchesText && matchesFilter && matchesCategory;
  });
  grid.innerHTML = visible.map(book => {
    const isFavorite=favorites.has(bookKey(book.id));
    const tag = book.type === "gratuito" ? '<span class="status-tag">Gratuito</span>' :
      book.type === "pago" ? '<span class="status-tag paid">Pago</span>' : '<span class="status-tag">Em breve</span>';
    const cover = book.coverUrl
      ? '<img class="book-cover-image" src="'+escapeHTML(book.coverUrl)+'" alt="Capa de '+escapeHTML(book.title)+'">'
      : '<div class="cover-art '+escapeHTML(book.tone||"tone-one")+'"><small>84 BOOKS PUBLISHING</small><strong>'+escapeHTML(book.title)+'</strong><span class="cover-number">84</span><small>CONHECIMENTO SEM FRONTEIRAS</small></div>';
    const price = bookPriceLabel(book);
    return '<article class="book-card" data-book-card="'+escapeHTML(book.id)+'" role="link" tabindex="0" aria-label="Abrir detalhes de '+escapeHTML(book.title)+'">'+
      '<div class="cover-wrap">'+cover+tag+
        '<button class="favorite-btn '+(isFavorite?"is-favorite":"")+'" data-favorite="'+escapeHTML(book.id)+'" aria-label="'+(isFavorite?"Remover dos favoritos":"Adicionar aos favoritos")+'">'+(isFavorite?"♥":"♡")+'</button>'+
      '</div><div class="book-info"><span class="book-category">'+escapeHTML(book.category||"Geral")+'</span><h3>'+escapeHTML(book.title)+'</h3><p class="book-author">Por '+escapeHTML(book.author)+'</p><div class="book-bottom"><span class="book-price">'+price+'</span><button class="book-open" data-open="'+escapeHTML(book.id)+'">Ver detalhes →</button></div></div></article>';
  }).join("");
  empty.hidden = visible.length !== 0;
  if(visible.length===0){
    const heading=empty.querySelector("h3"),description=empty.querySelector("p");
    if(catalogLoadError){
      heading.textContent="Não foi possível carregar a biblioteca";
      description.textContent="Verifique a ligação e tente novamente dentro de instantes.";
    }else if(books.length===0){
      heading.textContent="Ainda não há livros publicados";
      description.textContent="As obras oficiais da 84 Books Publishing aparecerão aqui assim que forem lançadas.";
    }else{
      heading.textContent="Nenhum livro encontrado";
      description.textContent="Experimente outro título, autor ou género.";
    }
  }
  updateGenreFilterSelection();
  renderHome();
}
document.getElementById("filterList").addEventListener("click", event => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll("#filterList [data-filter]").forEach(chip => chip.classList.toggle("selected", chip === button));
  renderBooks();
});
if(genreFilterList){
  genreFilterList.addEventListener("click",event=>{
    const button=event.target.closest("[data-genre-filter]");
    if(!button)return;
    activeCategory=button.dataset.genreFilter||"todos";
    renderBooks();
  });
}
search.addEventListener("input", renderBooks);
const homeCategories=document.getElementById("homeCategories");
if(homeCategories){
  homeCategories.addEventListener("click",event=>{
    const button=event.target.closest("[data-home-category]");
    if(!button)return;
    activeFilter="todos";
    activeCategory=button.dataset.homeCategory||"todos";
    search.value="";
    renderGenreFilters();
    navigate("biblioteca");
  });
}
grid.addEventListener("click", event => {
  const favoriteButton = event.target.closest("[data-favorite]");
  if (favoriteButton) {
    const id = parseBookId(favoriteButton.dataset.favorite);
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    savePreference("84books-favorites", JSON.stringify([...favorites]));
    renderBooks();
    return;
  }
  const openButton = event.target.closest("[data-open]");
  const bookCard = event.target.closest("[data-book-card]");
  if (openButton || bookCard) {
    const id = parseBookId(openButton ? openButton.dataset.open : bookCard.dataset.bookCard);
    navigate("livro/" + encodeURIComponent(id));
  }
});
grid.addEventListener("keydown", event => {
  const card = event.target.closest("[data-book-card]");
  if (card && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    navigate("livro/" + encodeURIComponent(parseBookId(card.dataset.bookCard)));
  }
});
function escapeHTML(value){
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[char]));
}
function renderBookDetail(id){
  const book=books.find(item=>item.id===parseBookId(id));
  const container=document.getElementById("bookDetailContent");
  if(!book||!container){navigate("biblioteca");return;}
  const tag=book.type==="gratuito"?"Gratuito":book.type==="pago"?"Pago · compra em preparação":"Em preparação";
  const accessNote=book.type==="gratuito"
    ?"O livro gratuito poderá ser descarregado quando existir um PDF associado à publicação."
    :book.type==="pago"
      ?"Este título está no catálogo. A compra e o acesso integral serão ativados numa próxima etapa."
      :"A equipa editorial ainda está a preparar esta publicação. Volte mais tarde para conhecer as novidades.";
  const cover=book.coverUrl
    ?'<img class="book-cover-image" src="'+escapeHTML(book.coverUrl)+'" alt="Capa de '+escapeHTML(book.title)+'">'
    :'<div class="cover-art '+escapeHTML(book.tone||"tone-one")+'"><small>84 BOOKS PUBLISHING</small><strong>'+escapeHTML(book.title)+'</strong><span class="cover-number">84</span><small>CONHECIMENTO SEM FRONTEIRAS</small></div>';
  const description=book.description||book.excerpt||"Uma publicação da 84 Books Publishing.";
  const canDownload=book.type==="gratuito"&&!!book.filePath&&!!current84User&&current84Role==="admin";
  const canRead=!!book.filePath&&(book.type==="gratuito"||current84Role==="admin");
  container.innerHTML=
    '<div class="detail-topbar"><button class="detail-back" id="detailBack" type="button">← Voltar à biblioteca</button><span>84 BOOKS PUBLISHING / CATÁLOGO</span></div>'+
    '<div class="book-detail-layout"><div class="detail-cover-wrap">'+cover+'</div><div class="book-detail-copy">'+
    '<span class="detail-category">'+escapeHTML(book.category||"Geral")+'</span><span class="detail-status">'+escapeHTML(tag)+'</span>'+
    '<h1>'+escapeHTML(book.title)+'</h1><p class="detail-author">Por '+escapeHTML(book.author)+'</p>'+
    '<p class="detail-description">'+escapeHTML(description)+'</p>'+
    '<div class="detail-meta"><span>EDITORA</span><strong>84 Books Publishing</strong><span>ACESSO</span><strong>'+escapeHTML(bookPriceLabel(book))+'</strong></div>'+
    '<div class="detail-actions">'+(book.type==="breve"?'<span class="detail-coming">Publicação em preparação</span>':'<button class="button button-primary" id="detailPreviewToggle" type="button">Ler prévia <span>→</span></button>')+
    (canRead?'<button class="button button-primary" id="detailReadBook" type="button">Ler livro completo <span>→</span></button>':"")+
    (canDownload?'<button class="detail-favorite" id="detailDownload" type="button">↓ Descarregar PDF</button>':"")+
    '<button class="detail-favorite" id="detailFavorite" type="button">'+(favorites.has(bookKey(book.id))?"♥ Guardado nos favoritos":"♡ Adicionar aos favoritos")+'</button></div>'+
    '<p class="detail-note">'+escapeHTML(accessNote)+'</p></div></div>'+
    '<section class="pdf-reader" id="bookPdfReader" hidden aria-label="Leitor de livro em PDF">'+
      '<div class="pdf-reader-heading"><div><span class="detail-category">LEITOR DIGITAL 84 BOOKS</span><h2 id="pdfReaderTitle">Leitura do livro</h2><p id="pdfReaderStatus" role="status" aria-live="polite">O leitor está pronto para abrir o PDF.</p></div><button type="button" class="pdf-reader-close" id="pdfReaderClose">Fechar leitor ×</button></div>'+
      '<div class="pdf-reader-toolbar"><button type="button" id="pdfPrevPage" disabled>← Anterior</button><label>Página <input id="pdfPageNumber" type="number" min="1" value="1" disabled> de <strong id="pdfPageCount">—</strong></label><button type="button" id="pdfNextPage" disabled>Seguinte →</button><span class="pdf-reader-toolbar-spacer"></span><button type="button" id="pdfZoomOut" disabled>−</button><span id="pdfZoomValue">100%</span><button type="button" id="pdfZoomIn" disabled>+</button></div>'+
      '<div class="pdf-reader-viewport" id="pdfReaderViewport"><canvas id="pdfReaderCanvas"></canvas></div>'+
      '<p class="pdf-reader-footnote">O PDF é apresentado dentro da plataforma. O acesso ao ficheiro é temporário e protegido.</p>'+
    '</section>'+
    '<section class="detail-preview" id="detailPreview" hidden><span class="detail-category">PRÉ-VISUALIZAÇÃO</span><h2>Abra as primeiras páginas.</h2><p id="detailPreviewText"></p><p class="detail-note">Esta é uma amostra disponibilizada pela editora.</p></section>'+
    '<section class="book-feedback" aria-labelledby="bookFeedbackTitle">'+
      '<div class="feedback-heading"><span class="detail-category">OPINIÕES DA COMUNIDADE</span><h2 id="bookFeedbackTitle">Comentários e avaliações</h2><p>Leia o que outros leitores acharam desta obra e partilhe a sua própria opinião.</p></div>'+
      '<div class="feedback-summary"><div class="feedback-average" id="feedbackAverage">—</div><div class="feedback-summary-copy"><div class="feedback-stars" id="feedbackStars" aria-label="Sem avaliações">☆☆☆☆☆</div><p id="feedbackStats">A carregar opiniões...</p></div></div>'+
      '<div class="book-reviews-list" id="bookReviewsList" aria-live="polite"><p class="feedback-empty">A carregar comentários...</p></div>'+
      '<form class="book-review-form" id="bookReviewForm" data-book-id="'+escapeHTML(book.id)+'">'+
        '<div><span class="detail-category">A SUA PARTICIPAÇÃO</span><h3 id="reviewFormHeading">Deixe a sua opinião</h3><p class="review-form-note">Pode comentar, avaliar de 0 a 5, ou fazer as duas coisas. Uma opinião por pessoa em cada livro; pode atualizá-la depois.</p></div>'+
        '<label class="review-rating-label">A sua avaliação (0 a 5)</label>'+
        '<div class="review-rating-options" role="group" aria-label="Escolher avaliação">'+
          '<button type="button" class="review-rating-zero" data-review-rating="0" aria-label="Zero estrelas">0</button>'+
          '<button type="button" data-review-rating="1" aria-label="Uma estrela">★</button>'+
          '<button type="button" data-review-rating="2" aria-label="Duas estrelas">★★</button>'+
          '<button type="button" data-review-rating="3" aria-label="Três estrelas">★★★</button>'+
          '<button type="button" data-review-rating="4" aria-label="Quatro estrelas">★★★★</button>'+
          '<button type="button" data-review-rating="5" aria-label="Cinco estrelas">★★★★★</button>'+
        '</div>'+
        '<input type="hidden" id="bookReviewRating" value="">'+
        '<p class="review-rating-help" id="reviewRatingLabel">Ainda não selecionou uma classificação.</p>'+
        '<label class="review-comment-label" for="bookReviewText">O seu comentário</label>'+
        '<textarea id="bookReviewText" rows="4" maxlength="2000" placeholder="O que achou deste livro? O que mais gostou ou o que poderia melhorar?"></textarea>'+
        '<div class="review-submit-row"><p class="review-submit-message" id="bookReviewMessage" role="status" aria-live="polite">Inicie sessão para publicar a sua opinião.</p><button class="button button-primary" id="bookReviewSubmit" type="submit">Publicar opinião <span>→</span></button></div>'+
      '</form>'+
    '</section>';
  const back=document.getElementById("detailBack");
  if(back)back.addEventListener("click",()=>navigate("biblioteca"));
  const previewButton=document.getElementById("detailPreviewToggle");
  if(previewButton)previewButton.addEventListener("click",()=>{
    const preview=document.getElementById("detailPreview"),opening=preview.hidden;
    preview.hidden=!opening;
    previewButton.innerHTML=opening?"Fechar prévia <span>↑</span>":"Ler prévia <span>→</span>";
    if(opening)preview.scrollIntoView({behavior:"smooth",block:"start"});
  });
  const previewText=document.getElementById("detailPreviewText");
  if(previewText)previewText.textContent=book.previewText||book.excerpt||description;
  const favoriteButton=document.getElementById("detailFavorite");
  if(favoriteButton)favoriteButton.addEventListener("click",()=>{
    const key=bookKey(book.id);
    favorites.has(key)?favorites.delete(key):favorites.add(key);
    savePreference("84books-favorites",JSON.stringify([...favorites]));
    favoriteButton.textContent=favorites.has(key)?"♥ Guardado nos favoritos":"♡ Adicionar aos favoritos";
    renderBooks();
  });
  const readButton=document.getElementById("detailReadBook");
  if(readButton)readButton.addEventListener("click",()=>window.dispatchEvent(new CustomEvent("84books:open-reader",{detail:{path:book.filePath,bookId:String(book.id),title:book.title,bookType:book.type}})));
  const readerClose=document.getElementById("pdfReaderClose");
  if(readerClose)readerClose.addEventListener("click",()=>window.dispatchEvent(new Event("84books:close-reader")));
  const readerPrev=document.getElementById("pdfPrevPage");
  const readerNext=document.getElementById("pdfNextPage");
  const readerPage=document.getElementById("pdfPageNumber");
  const readerZoomOut=document.getElementById("pdfZoomOut");
  const readerZoomIn=document.getElementById("pdfZoomIn");
  if(readerPrev)readerPrev.addEventListener("click",()=>window.dispatchEvent(new Event("84books:reader-prev")));
  if(readerNext)readerNext.addEventListener("click",()=>window.dispatchEvent(new Event("84books:reader-next")));
  if(readerPage)readerPage.addEventListener("change",()=>window.dispatchEvent(new CustomEvent("84books:reader-page",{detail:{page:readerPage.value}})));
  if(readerZoomOut)readerZoomOut.addEventListener("click",()=>window.dispatchEvent(new CustomEvent("84books:reader-zoom",{detail:{direction:-1}})));
  if(readerZoomIn)readerZoomIn.addEventListener("click",()=>window.dispatchEvent(new CustomEvent("84books:reader-zoom",{detail:{direction:1}})));
  const downloadButton=document.getElementById("detailDownload");
  if(downloadButton)downloadButton.addEventListener("click",()=>window.dispatchEvent(new CustomEvent("84books:download-book",{detail:{path:book.filePath}})));
  const reviewForm=document.getElementById("bookReviewForm");
  if(reviewForm){
    reviewForm.querySelectorAll("[data-review-rating]").forEach(button=>button.addEventListener("click",()=>{
      const value=button.dataset.reviewRating;
      document.getElementById("bookReviewRating").value=value;
      reviewForm.querySelectorAll("[data-review-rating]").forEach(item=>item.classList.toggle("selected",item===button));
      document.getElementById("reviewRatingLabel").textContent=value+" de 5 estrelas selecionadas.";
    }));
  }
  window.dispatchEvent(new CustomEvent("84books:load-reviews",{detail:{bookId:String(book.id)}}));
}
let current84User=null,authReady=false,current84Role="reader",welcomeCheckUserId=null,welcomeShownForUserId=null;
function navigate(path){
  const target="#/"+String(path||"inicio").replace(/^\/+/, "");
  if(window.location.hash===target)renderRoute();else window.location.hash=target;
}
function parseRoute(){
  const raw=window.location.hash.startsWith("#/")?window.location.hash.slice(2):"inicio";
  const parts=raw.split("/").filter(Boolean);
  if(parts[0]==="livro"&&parts[1])return{page:"livro",id:parseBookId(decodeURIComponent(parts[1]))};
  if(parts[0]==="membros")return{page:"membros",tab:parts[1]||"profile"};
  if(parts[0]==="favoritos"){activeFilter="favoritos";return{page:"biblioteca",fromFavorites:true};}
  if(parts[0]==="biblioteca")activeFilter="todos";
  const known=["inicio","boas-vindas","biblioteca","comunidade","sobre","contacto"];
  return{page:known.includes(parts[0])?parts[0]:"inicio"};
}
function renderRoute(){
  const route=parseRoute();
  if(route.page!=="inicio")hideFirstWelcome();
  if(route.page==="membros"&&authReady&&!current84User){
    window.location.hash="#/inicio";
    window.dispatchEvent(new Event("84books:login-required"));
    return;
  }
  if(route.page==="membros"&&route.tab==="admin"&&authReady&&current84Role!=="admin"){window.location.hash="#/membros/profile";return;}
  document.querySelectorAll("[data-page]").forEach(page=>page.hidden=page.dataset.page!==route.page);
  if(route.page==="biblioteca"){
    document.querySelectorAll(".filter-chip").forEach(chip=>chip.classList.toggle("selected",chip.dataset.filter===activeFilter));
    renderBooks();
  }
  const routeSiteMenu=document.getElementById("siteMenu"),routeMenuToggle=document.getElementById("menuToggle");
  if(routeSiteMenu)routeSiteMenu.hidden=true;
  if(routeMenuToggle)routeMenuToggle.setAttribute("aria-expanded","false");
  document.querySelectorAll("[data-route]").forEach(link=>{
    const activePage=route.page==="livro"?"biblioteca":route.page;
    link.classList.toggle("active",link.dataset.route===activePage);
  });
  const mainNav=document.getElementById("mainNav");
  if(mainNav)mainNav.classList.remove("open");
  if(route.page==="livro")renderBookDetail(route.id);
  if(route.page==="membros"){
    const allowed=["profile","library","community","admin"],tab=allowed.includes(route.tab)&&(route.tab!=="admin"||current84Role==="admin")?route.tab:"profile";
    document.querySelectorAll("[data-member-tab]").forEach(item=>item.classList.toggle("active",item.dataset.memberTab===tab));
    document.querySelectorAll("[data-member-panel]").forEach(panel=>panel.hidden=panel.dataset.memberPanel!==tab);
    if(tab==="admin")window.dispatchEvent(new Event("84books:admin-open"));
  }
  const titles={inicio:"Início","boas-vindas":"Boas-vindas",biblioteca:"Biblioteca",comunidade:"Comunidade",sobre:"Sobre nós",contacto:"Contacto",membros:"Minha área"};
  const book=route.page==="livro"?books.find(item=>item.id===route.id):null;
  document.title=book?book.title+" | 84 Books Publishing":(titles[route.page]||"84 Books Publishing")+" | 84 Books Publishing";
  window.scrollTo(0,0);
}
window.addEventListener("hashchange",renderRoute);
document.querySelectorAll("[data-member-tab]").forEach(tab=>tab.addEventListener("click",()=>navigate("membros/"+tab.dataset.memberTab)));
const menuToggle = document.getElementById("menuToggle");
const siteMenu = document.getElementById("siteMenu");
menuToggle.addEventListener("click", () => {
  const open = siteMenu.hidden;
  siteMenu.hidden = !open;
  menuToggle.setAttribute("aria-expanded", String(open));
});
siteMenu.addEventListener("click", event => {
  if(event.target.closest("a")){
    siteMenu.hidden=true;
    menuToggle.setAttribute("aria-expanded","false");
  }
});
document.addEventListener("click",event=>{
  if(!event.target.closest(".site-header") && !siteMenu.hidden){
    siteMenu.hidden=true;
    menuToggle.setAttribute("aria-expanded","false");
  }
});
document.getElementById("year").textContent = new Date().getFullYear();
renderGenreFilters();
renderBooks();
renderHome();
renderRoute();

// Alternância de tema — tratamento reforçado para telemóveis.
(function setup84Theme(){
  const button = document.getElementById("menuThemeToggle");
  const icon = document.getElementById("themeIcon");
  const label = document.getElementById("themeLabel");
  if (!button || !icon || !label) return;

  function readTheme(){
    try { return localStorage.getItem("84books-theme"); }
    catch(error) { return null; }
  }
  function setTheme(theme){
    const isLight = theme === "light";
    document.body.setAttribute("data-theme", isLight ? "light" : "dark");
    icon.textContent = isLight ? "☾" : "☀";
    label.textContent = isLight ? "Modo escuro" : "Modo claro";
    button.setAttribute("aria-label", isLight ? "Ativar modo escuro" : "Ativar modo claro");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", isLight ? "#fffdfa" : "#090b11");
    try { localStorage.setItem("84books-theme", isLight ? "light" : "dark"); }
    catch(error) {}
  }

  setTheme(readTheme() === "light" ? "light" : "dark");
  button.onclick = function(){
    setTheme(document.body.getAttribute("data-theme") === "dark" ? "light" : "dark");
  };
})();


// 84 Books Publishing — autenticação, catálogo e administração
(function setup84SupabaseAuth(){
  const PROJECT_URL = "https://ruvtjfryrrbjtctgvwtc.supabase.co";
  const PUBLISHABLE_KEY = "sb_publishable_44W6KLQQbzEAbIdI2YZASg_uoJzm2-C";
  const openButton = document.getElementById("accountOpen");
  const overlay = document.getElementById("authOverlay");
  if (!openButton || !overlay) return;

  const closeButton = document.getElementById("authClose");
  const form = document.getElementById("authForm");
  const title = document.getElementById("authTitle");
  const fullNameWrap = document.getElementById("fullNameWrap");
  const fullNameInput = document.getElementById("authFullName");
  const emailInput = document.getElementById("authEmail");
  const passwordInput = document.getElementById("authPassword");
  const submitButton = document.getElementById("authSubmit");
  const forgotButton = document.getElementById("forgotPassword");
  const resendButton = document.getElementById("resendConfirmation");
  const message = document.getElementById("authMessage");
  const sessionPanel = document.getElementById("accountSession");
  const welcome = document.getElementById("accountWelcome");
  const signOutButton = document.getElementById("signOutButton");
  const menuSignOut = document.getElementById("menuSignOut");
  const adminMenuLink = document.getElementById("adminMenuLink");
  const adminMemberTab = document.getElementById("adminMemberTab");
  const roleBadge = document.getElementById("memberRoleBadge");
  const memberArea = document.getElementById("memberArea");
  const memberName = document.getElementById("memberName");
  const memberHome = document.getElementById("memberHome");
  const profileForm = document.getElementById("profileForm");
  const profileMessage = document.getElementById("profileMessage");
  const profileSave = document.getElementById("profileSave");
  const adminForm = document.getElementById("adminBookForm");
  const adminList = document.getElementById("adminBooksList");
  const adminMessage = document.getElementById("adminBookMessage");
  const adminSave = document.getElementById("adminBookSave");
  const adminFormTitle = document.getElementById("adminFormTitle");
  const adminCancel = document.getElementById("adminBookCancel");
  const adminFields = {
    id:document.getElementById("adminBookId"),
    coverPath:document.getElementById("adminBookCoverPath"),
    filePath:document.getElementById("adminBookFilePath"),
    title:document.getElementById("adminBookTitle"),
    author:document.getElementById("adminBookAuthor"),
    category:document.getElementById("adminBookCategory"),
    type:document.getElementById("adminBookType"),
    price:document.getElementById("adminBookPrice"),
    status:document.getElementById("adminBookStatus"),
    description:document.getElementById("adminBookDescription"),
    preview:document.getElementById("adminBookPreview"),
    cover:document.getElementById("adminBookCover"),
    file:document.getElementById("adminBookFile")
  };
  const profileFields = {
    fullName: document.getElementById("profileFullName"),
    displayName: document.getElementById("profileDisplayName"),
    country: document.getElementById("profileCountry"),
    dialCode: document.getElementById("profileDialCode"),
    phone: document.getElementById("profilePhone"),
    gender: document.getElementById("profileGender"),
    birthDate: document.getElementById("profileBirthDate"),
    type: document.getElementById("profileType"),
    bio: document.getElementById("profileBio")
  };

  let currentUser = null;
  let mode = "login";
  let supabaseClient = null;
  let adminBookCache = [];
  let pdfJsPromise = null;
  let activePdfDocument = null;
  let activePdfRenderTask = null;
  let activePdfPage = 1;
  let activePdfZoom = 1;
  let activePdfTitle = "";
  let activePdfToken = 0;

  function setPdfReaderStatus(text,isError){
    const node=document.getElementById("pdfReaderStatus");
    if(node){node.textContent=text;node.classList.toggle("error",!!isError);}
  }

  function loadPdfJs(){
    if(window.pdfjsLib){
      window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      return Promise.resolve(window.pdfjsLib);
    }
    if(pdfJsPromise)return pdfJsPromise;
    pdfJsPromise=new Promise((resolve,reject)=>{
      const script=document.createElement("script");
      script.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.async=true;
      script.onload=()=>{
        if(!window.pdfjsLib){pdfJsPromise=null;reject(new Error("A biblioteca de leitura PDF não foi carregada."));return;}
        window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve(window.pdfjsLib);
      };
      script.onerror=()=>{pdfJsPromise=null;reject(new Error("Não foi possível carregar o leitor PDF. Verifique a ligação à internet."));};
      document.head.appendChild(script);
    });
    return pdfJsPromise;
  }

  function updatePdfReaderControls(){
    const total=activePdfDocument?activePdfDocument.numPages:0;
    const pageInput=document.getElementById("pdfPageNumber");
    const count=document.getElementById("pdfPageCount");
    const prev=document.getElementById("pdfPrevPage");
    const next=document.getElementById("pdfNextPage");
    const zoomOut=document.getElementById("pdfZoomOut");
    const zoomIn=document.getElementById("pdfZoomIn");
    const zoomValue=document.getElementById("pdfZoomValue");
    if(pageInput){pageInput.value=String(activePdfPage);pageInput.max=String(total||1);pageInput.disabled=!total;}
    if(count)count.textContent=total?String(total):"—";
    if(prev)prev.disabled=!total||activePdfPage<=1;
    if(next)next.disabled=!total||activePdfPage>=total;
    if(zoomOut)zoomOut.disabled=!total||activePdfZoom<=0.65;
    if(zoomIn)zoomIn.disabled=!total||activePdfZoom>=2.2;
    if(zoomValue)zoomValue.textContent=Math.round(activePdfZoom*100)+"%";
  }

  async function renderPdfReaderPage(){
    if(!activePdfDocument)return;
    const token=activePdfToken;
    const canvas=document.getElementById("pdfReaderCanvas");
    const viewportNode=document.getElementById("pdfReaderViewport");
    if(!canvas||!viewportNode)return;
    try{
      if(activePdfRenderTask){try{activePdfRenderTask.cancel();}catch(error){}}
      const page=await activePdfDocument.getPage(activePdfPage);
      if(token!==activePdfToken)return;
      const base=page.getViewport({scale:1});
      const availableWidth=Math.max(260,viewportNode.clientWidth-32);
      const fitScale=Math.min(1.6,availableWidth/base.width);
      const viewport=page.getViewport({scale:fitScale*activePdfZoom});
      const outputScale=Math.min(window.devicePixelRatio||1,2);
      canvas.width=Math.floor(viewport.width*outputScale);
      canvas.height=Math.floor(viewport.height*outputScale);
      canvas.style.width=Math.floor(viewport.width)+"px";
      canvas.style.height=Math.floor(viewport.height)+"px";
      const context=canvas.getContext("2d",{alpha:false});
      context.setTransform(outputScale,0,0,outputScale,0,0);
      activePdfRenderTask=page.render({canvasContext:context,viewport});
      await activePdfRenderTask.promise;
      if(token!==activePdfToken)return;
      setPdfReaderStatus("A ler: "+activePdfTitle+" · Página "+activePdfPage+" de "+activePdfDocument.numPages+".");
      updatePdfReaderControls();
    }catch(error){
      if(error&&error.name==="RenderingCancelledException")return;
      setPdfReaderStatus("Não foi possível apresentar esta página do PDF. Tente novamente.",true);
      console.warn("84 Books: erro ao desenhar página PDF.",error);
    }
  }

  async function openPdfReader(detail){
    const reader=document.getElementById("bookPdfReader");
    if(!reader)return;
    reader.hidden=false;
    reader.scrollIntoView({behavior:"smooth",block:"start"});
    activePdfTitle=String(detail.title||"Livro");
    const titleNode=document.getElementById("pdfReaderTitle");
    if(titleNode)titleNode.textContent=activePdfTitle;
    if(!currentUser){
      setPdfReaderStatus("Inicie sessão para solicitar acesso à leitura.",true);
      window.dispatchEvent(new Event("84books:login-required"));
      return;
    }
    if(!detail.path){
      setPdfReaderStatus("Este livro ainda não tem um ficheiro PDF associado.",true);
      return;
    }
    if(current84Role!=="admin"){
      setPdfReaderStatus("A leitura protegida por anúncio recompensado ainda está a ser integrada. Não vamos simular anúncios nem libertar o PDF antes da confirmação real do fornecedor.",true);
      return;
    }
    setPdfReaderStatus("A preparar o documento para leitura...");
    const requestToken=++activePdfToken;
    try{
      const {data,error}=await supabaseClient.storage.from("84books-files").createSignedUrl(detail.path,300);
      if(error)throw error;
      if(!data||!data.signedUrl)throw new Error("Não foi possível criar o acesso temporário ao PDF.");
      const pdfjs=await loadPdfJs();
      const loadingTask=pdfjs.getDocument({url:data.signedUrl});
      const pdf=await loadingTask.promise;
      if(requestToken!==activePdfToken){try{await pdf.destroy();}catch(error){}return;}
      if(activePdfDocument){try{await activePdfDocument.destroy();}catch(error){}}
      activePdfDocument=pdf;
      activePdfPage=1;
      activePdfZoom=1;
      updatePdfReaderControls();
      setPdfReaderStatus("PDF carregado. A preparar a primeira página...");
      await renderPdfReaderPage();
    }catch(error){
      setPdfReaderStatus(error.message||"Não foi possível abrir este PDF.",true);
      console.warn("84 Books: erro ao abrir PDF.",error);
    }
  }

  async function closePdfReader(){
    activePdfToken++;
    if(activePdfRenderTask){try{activePdfRenderTask.cancel();}catch(error){}activePdfRenderTask=null;}
    if(activePdfDocument){try{await activePdfDocument.destroy();}catch(error){}activePdfDocument=null;}
    const reader=document.getElementById("bookPdfReader");
    const canvas=document.getElementById("pdfReaderCanvas");
    if(canvas){canvas.width=0;canvas.height=0;}
    if(reader)reader.hidden=true;
    updatePdfReaderControls();
  }

  window.addEventListener("84books:open-reader",event=>openPdfReader(event.detail||{}));
  window.addEventListener("84books:close-reader",closePdfReader);
  window.addEventListener("84books:reader-prev",()=>{
    if(activePdfDocument&&activePdfPage>1){activePdfPage--;renderPdfReaderPage();}
  });
  window.addEventListener("84books:reader-next",()=>{
    if(activePdfDocument&&activePdfPage<activePdfDocument.numPages){activePdfPage++;renderPdfReaderPage();}
  });
  window.addEventListener("84books:reader-page",event=>{
    const page=Number(event.detail&&event.detail.page);
    if(activePdfDocument&&Number.isInteger(page)&&page>=1&&page<=activePdfDocument.numPages){activePdfPage=page;renderPdfReaderPage();}
    else updatePdfReaderControls();
  });
  window.addEventListener("84books:reader-zoom",event=>{
    if(!activePdfDocument)return;
    activePdfZoom=Math.max(0.65,Math.min(2.2,activePdfZoom+(Number(event.detail&&event.detail.direction)>0?0.15:-0.15)));
    renderPdfReaderPage();
    updatePdfReaderControls();
  });
  window.addEventListener("resize",()=>{
    const reader=document.getElementById("bookPdfReader");
    if(reader&&!reader.hidden&&activePdfDocument)renderPdfReaderPage();
  });

  function showMessage(text, isError){
    message.textContent = text || "";
    message.classList.toggle("error",!!isError);
  }
  function showAdminMessage(text,isError){
    adminMessage.textContent=text||"";
    adminMessage.classList.toggle("error",!!isError);
  }
  function setAdminVisibility(){
    const admin=current84Role==="admin"&&!!currentUser;
    adminMenuLink.hidden=!admin;
    adminMemberTab.hidden=!admin;
    roleBadge.hidden=!admin;
    menuSignOut.hidden=!currentUser;
  }
  function setMode(nextMode){
    mode = nextMode;
    document.querySelectorAll("[data-auth-mode]").forEach(tab => tab.classList.toggle("active",tab.dataset.authMode===mode));
    fullNameWrap.hidden = mode !== "signup";
    fullNameInput.required = mode === "signup";
    passwordInput.autocomplete = mode === "signup" ? "new-password" : "current-password";
    title.textContent = mode === "signup" ? "Crie a sua conta gratuita." : "A sua biblioteca começa aqui.";
    submitButton.textContent = mode === "signup" ? "Criar a minha conta" : "Entrar na minha conta";
    forgotButton.hidden = mode === "signup";
    resendButton.hidden = true;
    showMessage("");
  }
  function showOverlay(){
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden","false");
    document.body.style.overflow="hidden";
  }
  function hideOverlay(){
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden","true");
    document.body.style.overflow="";
  }
  function renderSession(session){
    const user = session && session.user;
    const previousUserId=current84User&&current84User.id;
    currentUser = user || null;
    current84User = currentUser;
    if(!user){
      closePdfReader();
      welcomeCheckUserId=null;
      welcomeShownForUserId=null;
      hideFirstWelcome();
    }else if(previousUserId!==user.id){
      welcomeCheckUserId=null;
      welcomeShownForUserId=null;
      hideFirstWelcome();
    }
    form.hidden = !!user;
    forgotButton.hidden = !!user || mode === "signup";
    resendButton.hidden = !!user || mode === "signup";
    sessionPanel.hidden = true;
    openButton.textContent = user ? "Minha área" : "Entrar / Criar conta";
    if(user){
      const name = user.user_metadata && user.user_metadata.full_name;
      welcome.textContent = "Sessão iniciada como " + (name || user.email || "leitor") + ".";
      showMessage("");
    } else {
      memberArea.hidden = true;
      current84Role="reader";
    }
    setAdminVisibility();
  }

  async function loadPublicBooks(){
    const {data,error}=await supabaseClient.from("books")
      .select("id,title,author,category,description,preview_text,book_type,price,status,cover_path,file_path,created_at")
      .eq("status","published")
      .order("created_at",{ascending:false});
    if(error){
      console.warn("84 Books: catálogo remoto ainda não disponível.",error.message);
      catalogLoadError=true;
      books=[];
      renderGenreFilters();
      renderBooks();
      renderHome();
      return;
    }
    const remote=(data||[]).map(row=>{
      const coverResult=row.cover_path?supabaseClient.storage.from("84books-covers").getPublicUrl(row.cover_path):null;
      return {
        id:String(row.id),
        title:row.title,
        author:row.author,
        category:row.category||"Geral",
        description:row.description||"",
        previewText:row.preview_text||"",
        type:row.book_type,
        price:Number(row.price||0),
        priceLabel:row.book_type==="gratuito"?"Grátis":row.book_type==="pago"?(Number(row.price||0).toLocaleString("pt-AO")+" Kz"):"Em preparação",
        status:row.status,
        createdAt:row.created_at||"",
        isRemote:true,
        coverUrl:coverResult&&coverResult.data?coverResult.data.publicUrl:"",
        filePath:row.file_path||"",
        tone:"tone-one",
        excerpt:row.preview_text||row.description||""
      };
    });
    catalogLoadError=false;
    books=[...remote];
    renderGenreFilters();
    renderBooks();
    renderHome();
    if(window.location.hash.startsWith("#/livro/")){
      const id=decodeURIComponent(window.location.hash.split("/")[2]||"");
      renderBookDetail(parseBookId(id));
    }
  }

  async function loadBookReviews(bookId){
    const list=document.getElementById("bookReviewsList");
    const averageNode=document.getElementById("feedbackAverage");
    const starsNode=document.getElementById("feedbackStars");
    const statsNode=document.getElementById("feedbackStats");
    const form=document.getElementById("bookReviewForm");
    if(!list||!averageNode||!starsNode||!statsNode||!form||form.dataset.bookId!==String(bookId))return;
    list.innerHTML='<p class="feedback-empty">A carregar comentários...</p>';
    const {data,error}=await supabaseClient.from("book_reviews")
      .select("id,book_id,user_id,author_name,comment,rating,created_at,updated_at")
      .eq("book_id",bookId)
      .order("created_at",{ascending:false});
    if(error){
      list.innerHTML='<p class="feedback-empty">Não foi possível carregar as opiniões neste momento. Tente novamente.</p>';
      statsNode.textContent="As opiniões ainda não estão disponíveis.";
      console.warn("84 Books: erro ao carregar opiniões.",error.message);
      return;
    }
    const reviews=data||[];
    const comments=reviews.filter(item=>String(item.comment||"").trim().length>0);
    const ratings=reviews.filter(item=>item.rating!==null&&item.rating!==undefined);
    const average=ratings.length?ratings.reduce((sum,item)=>sum+Number(item.rating),0)/ratings.length:null;
    averageNode.textContent=average===null?"—":average.toFixed(1).replace(".",",")+"/5";
    const rounded=average===null?0:Math.max(0,Math.min(5,Math.round(average)));
    starsNode.textContent="★".repeat(rounded)+"☆".repeat(5-rounded);
    starsNode.setAttribute("aria-label",average===null?"Sem avaliações":"Média de "+average.toFixed(1)+" em 5");
    statsNode.textContent=comments.length+" "+(comments.length===1?"pessoa comentou":"pessoas comentaram")+" · "+ratings.length+" "+(ratings.length===1?"avaliação":"avaliações");
    if(!reviews.length){
      list.innerHTML='<p class="feedback-empty">Este livro ainda não recebeu comentários. Seja a primeira pessoa a partilhar uma opinião.</p>';
    }else{
      list.innerHTML=reviews.map(item=>{
        const date=item.created_at?new Date(item.created_at).toLocaleDateString("pt-AO",{day:"2-digit",month:"short",year:"numeric"}):"";
        const rating=item.rating===null||item.rating===undefined?'<span class="review-no-rating">Sem avaliação</span>':'<span class="review-stars" aria-label="'+Number(item.rating)+' de 5 estrelas">'+"★".repeat(Number(item.rating))+"☆".repeat(5-Number(item.rating))+'</span><small>'+Number(item.rating)+'/5</small>';
        const comment=String(item.comment||"").trim();
        return '<article class="book-review-card"><div class="book-review-top"><strong>'+escapeHTML(item.author_name||"Leitor")+'</strong><time>'+escapeHTML(date)+'</time></div><div class="book-review-rating">'+rating+'</div><p>'+ (comment?escapeHTML(comment):'<span class="review-no-comment">O leitor deixou apenas uma avaliação.</span>') +'</p></article>';
      }).join("");
    }
    const ownReview=currentUser?reviews.find(item=>item.user_id===currentUser.id):null;
    const textField=document.getElementById("bookReviewText");
    const ratingField=document.getElementById("bookReviewRating");
    const ratingLabel=document.getElementById("reviewRatingLabel");
    const submit=document.getElementById("bookReviewSubmit");
    const heading=document.getElementById("reviewFormHeading");
    form.querySelectorAll("[data-review-rating]").forEach(button=>button.classList.remove("selected"));
    if(ownReview){
      if(textField)textField.value=ownReview.comment||"";
      if(ratingField)ratingField.value=ownReview.rating===null||ownReview.rating===undefined?"":String(ownReview.rating);
      if(ownReview.rating!==null&&ownReview.rating!==undefined){
        const selected=form.querySelector('[data-review-rating="'+Number(ownReview.rating)+'"]');
        if(selected)selected.classList.add("selected");
        if(ratingLabel)ratingLabel.textContent=Number(ownReview.rating)+" de 5 estrelas selecionadas.";
      }else if(ratingLabel){ratingLabel.textContent="Ainda não selecionou uma classificação.";}
      if(heading)heading.textContent="Atualize a sua opinião";
      if(submit)submit.innerHTML="Guardar alterações <span>→</span>";
    }else{
      if(textField)textField.value="";
      if(ratingField)ratingField.value="";
      if(ratingLabel)ratingLabel.textContent="Ainda não selecionou uma classificação.";
      if(heading)heading.textContent="Deixe a sua opinião";
      if(submit)submit.innerHTML="Publicar opinião <span>→</span>";
    }
    const message=document.getElementById("bookReviewMessage");
    if(message)message.textContent=currentUser?"A sua opinião ficará associada à sua conta.":"Inicie sessão para publicar a sua opinião.";
  }

  window.addEventListener("84books:load-reviews",event=>{
    const bookId=event.detail&&event.detail.bookId;
    if(bookId)loadBookReviews(bookId);
  });

  document.addEventListener("submit",async event=>{
    const form=event.target;
    if(!form||form.id!=="bookReviewForm")return;
    event.preventDefault();
    const message=document.getElementById("bookReviewMessage");
    const submit=document.getElementById("bookReviewSubmit");
    if(!currentUser){
      window.dispatchEvent(new Event("84books:login-required"));
      return;
    }
    const bookId=form.dataset.bookId;
    const comment=(document.getElementById("bookReviewText").value||"").trim();
    const ratingValue=document.getElementById("bookReviewRating").value;
    const rating=ratingValue===""?null:Number(ratingValue);
    if(!comment&&rating===null){
      if(message)message.textContent="Escreva um comentário ou escolha uma classificação.";
      return;
    }
    if(submit){submit.disabled=true;submit.textContent="A publicar...";}
    if(message)message.textContent="A guardar a sua opinião...";
    try{
      const {error}=await supabaseClient.from("book_reviews").upsert({
        book_id:bookId,
        user_id:currentUser.id,
        comment,
        rating
      },{onConflict:"book_id,user_id"});
      if(error)throw error;
      if(message)message.textContent="A sua opinião foi guardada. Obrigado por participar!";
      await loadBookReviews(bookId);
    }catch(error){
      if(message)message.textContent=error.message||"Não foi possível guardar a opinião. Tente novamente.";
      console.warn("84 Books: erro ao publicar opinião.",error.message);
    }finally{
      if(submit)submit.disabled=false;
    }
  });

  async function loadMemberProfile(user){
    profileMessage.textContent = "A carregar o seu perfil...";
    const {data,error} = await supabaseClient
      .from("profiles")
      .select("full_name, display_name, phone, country, gender, birth_date, profile_type, bio, role, welcome_seen_at")
      .eq("id",user.id)
      .maybeSingle();
    if(error){
      current84Role="reader";
      setAdminVisibility();
      profileMessage.textContent = "Para ativar o perfil de administrador, execute o ficheiro supabase/admin-books.sql no SQL Editor do Supabase.";
      profileMessage.classList.add("error");
      const metaName = user.user_metadata && user.user_metadata.full_name;
      profileFields.fullName.value = metaName || "";
      memberName.textContent = metaName || "leitor";
      hideFirstWelcome();
      return;
    }
    profileMessage.textContent = "";
    profileMessage.classList.remove("error");
    const profile = data || {};
    current84Role=profile.role==="admin"?"admin":"reader";
    setAdminVisibility();
    profileFields.fullName.value = profile.full_name || (user.user_metadata && user.user_metadata.full_name) || "";
    profileFields.displayName.value = profile.display_name || "";
    profileFields.country.value = profile.country || "";
    profileFields.gender.value = profile.gender || "";
    profileFields.birthDate.value = profile.birth_date || "";
    profileFields.type.value = profile.profile_type || "reader";
    profileFields.bio.value = profile.bio || "";
    const phone = profile.phone || "";
    const phoneMatch = phone.match(/^(\+\d+)\s*(.*)$/);
    if(phoneMatch){
      if([...profileFields.dialCode.options].some(option => option.value === phoneMatch[1])) profileFields.dialCode.value = phoneMatch[1];
      profileFields.phone.value = phoneMatch[2];
    } else {
      profileFields.phone.value = phone;
    }
    memberName.textContent = profile.display_name || profile.full_name || profileFields.fullName.value || "leitor";
    const firstWelcomeName=profile.display_name || profile.full_name || profileFields.fullName.value;
    renderHomeGreeting(firstWelcomeName);
    if(profile.welcome_seen_at){
      welcomeCheckUserId=user.id;
      if(welcomeShownForUserId!==user.id)hideFirstWelcome();
    }else if(welcomeCheckUserId!==user.id){
      welcomeCheckUserId=user.id;
      const {data:welcomeMark,error:welcomeMarkError}=await supabaseClient
        .from("profiles")
        .update({welcome_seen_at:new Date().toISOString()})
        .eq("id",user.id)
        .is("welcome_seen_at",null)
        .select("welcome_seen_at")
        .maybeSingle();
      if(welcomeMarkError){
        console.warn("84 Books: não foi possível registar a primeira apresentação.",welcomeMarkError.message);
        if(current84User&&current84User.id===user.id){
          hideFirstWelcome();
          welcomeCheckUserId=null;
        }
      }else if(welcomeMark&&current84User&&current84User.id===user.id){
        welcomeShownForUserId=user.id;
        const welcomePanel=document.getElementById("homeWelcomePanel");
        if(welcomePanel)welcomePanel.hidden=false;
      }else{
        hideFirstWelcome();
      }
    }
  }

  async function openMemberArea(user){
    if(!user) return;
    memberArea.hidden = false;
    hideOverlay();
    navigate("membros/profile");
    await loadMemberProfile(user);
  }

  profileForm.addEventListener("submit",async event=>{
    event.preventDefault();
    if(!currentUser){profileMessage.textContent="Inicie sessão para editar o seu perfil.";return;}
    profileSave.disabled=true;
    profileSave.textContent="A guardar...";
    profileMessage.classList.remove("error");
    const phoneNumber = profileFields.phone.value.trim();
    const fullPhone = phoneNumber ? profileFields.dialCode.value + " " + phoneNumber : "";
    const updates = {
      full_name: profileFields.fullName.value.trim(),
      display_name: profileFields.displayName.value.trim(),
      phone: fullPhone,
      country: profileFields.country.value,
      gender: profileFields.gender.value,
      birth_date: profileFields.birthDate.value || null,
      profile_type: profileFields.type.value,
      bio: profileFields.bio.value.trim(),
      updated_at: new Date().toISOString()
    };
    try{
      const {error} = await supabaseClient.from("profiles").update(updates).eq("id",currentUser.id);
      if(error) throw error;
      memberName.textContent = updates.display_name || updates.full_name || "leitor";
      renderHomeGreeting(updates.display_name || updates.full_name);
      profileMessage.textContent = "Perfil guardado com sucesso.";
    }catch(error){
      profileMessage.textContent = error.message || "Não foi possível guardar o perfil.";
      profileMessage.classList.add("error");
    }finally{
      profileSave.disabled=false;
      profileSave.textContent="Guardar perfil";
    }
  });

  function resetAdminForm(){
    adminForm.reset();
    adminFields.id.value="";
    adminFields.coverPath.value="";
    adminFields.filePath.value="";
    adminFields.price.value="0";
    adminFields.type.value="gratuito";
    adminFields.status.value="published";
    adminFormTitle.textContent="Adicionar novo livro";
    adminSave.textContent="Publicar livro";
    adminCancel.hidden=true;
    showAdminMessage("");
  }

  async function renderAdminBooks(){
    if(current84Role!=="admin"||!currentUser)return;
    adminList.innerHTML='<p class="admin-empty">A carregar as publicações...</p>';
    const {data,error}=await supabaseClient.from("books")
      .select("id,title,author,category,book_type,price,status,cover_path,file_path,description,preview_text")
      .order("created_at",{ascending:false});
    if(error){
      adminList.innerHTML='<p class="admin-empty">Não foi possível carregar os livros. Confirme se executou supabase/admin-books.sql.</p>';
      return;
    }
    adminBookCache=data||[];
    if(!adminBookCache.length){
      adminList.innerHTML='<p class="admin-empty">Ainda não existem livros publicados por si. Use o formulário acima para adicionar o primeiro.</p>';
      return;
    }
    adminList.innerHTML=adminBookCache.map(book=>{
      const state=book.status==="published"?"PUBLICADO":"RASCUNHO";
      const type=book.book_type==="gratuito"?"Gratuito":book.book_type==="pago"?"Pago":"Em preparação";
      return '<article class="admin-book-row"><div class="admin-book-summary"><strong>'+escapeHTML(book.title)+'</strong><span>'+escapeHTML(book.author)+' · '+escapeHTML(book.category||"Geral")+' · '+type+'</span><span class="admin-book-status">'+state+'</span></div><div class="admin-book-actions"><button type="button" data-admin-edit="'+escapeHTML(book.id)+'">Editar</button><button type="button" class="admin-delete" data-admin-delete="'+escapeHTML(book.id)+'">Eliminar</button></div></article>';
    }).join("");
  }

  async function uploadAdminFile(bucket,file){
    if(!file)return null;
    const cleanName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const path=currentUser.id+"/"+Date.now()+"-"+Math.random().toString(36).slice(2)+"-"+cleanName;
    const {error}=await supabaseClient.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});
    if(error)throw error;
    return path;
  }

  adminForm.addEventListener("submit",async event=>{
    event.preventDefault();
    if(current84Role!=="admin"||!currentUser){showAdminMessage("Apenas o administrador pode publicar livros.",true);return;}
    const coverFile=adminFields.cover.files[0]||null;
    const pdfFile=adminFields.file.files[0]||null;
    if(coverFile&&(!/^image\/(jpeg|png|webp)$/.test(coverFile.type)||coverFile.size>8*1024*1024)){
      showAdminMessage("A capa deve ser JPG, PNG ou WEBP e ter no máximo 8 MB.",true);return;
    }
    if(pdfFile&&(pdfFile.type!=="application/pdf"||pdfFile.size>30*1024*1024)){
      showAdminMessage("O livro deve estar em PDF e ter no máximo 30 MB.",true);return;
    }
    adminSave.disabled=true;
    adminSave.textContent="A guardar...";
    showAdminMessage("A preparar a publicação...");
    const oldCover=adminFields.coverPath.value;
    const oldFile=adminFields.filePath.value;
    let newCover=oldCover,newFile=oldFile;
    try{
      if(coverFile)newCover=await uploadAdminFile("84books-covers",coverFile);
      if(pdfFile)newFile=await uploadAdminFile("84books-files",pdfFile);
      const payload={
        title:adminFields.title.value.trim(),
        author:adminFields.author.value.trim(),
        category:adminFields.category.value.trim()||"Geral",
        description:adminFields.description.value.trim(),
        preview_text:adminFields.preview.value.trim(),
        book_type:adminFields.type.value,
        price:adminFields.type.value==="gratuito"?0:Number(adminFields.price.value||0),
        status:adminFields.status.value,
        cover_path:newCover||null,
        file_path:newFile||null,
        updated_at:new Date().toISOString()
      };
      const id=adminFields.id.value;
      let result;
      if(id){
        result=await supabaseClient.from("books").update(payload).eq("id",id);
      }else{
        payload.created_by=currentUser.id;
        result=await supabaseClient.from("books").insert(payload);
      }
      if(result.error)throw result.error;
      if(oldCover&&newCover!==oldCover)await supabaseClient.storage.from("84books-covers").remove([oldCover]);
      if(oldFile&&newFile!==oldFile)await supabaseClient.storage.from("84books-files").remove([oldFile]);
      showAdminMessage(id?"Livro atualizado com sucesso.":"Livro publicado com sucesso.");
      resetAdminForm();
      await renderAdminBooks();
      await loadPublicBooks();
    }catch(error){
      showAdminMessage(error.message||"Não foi possível guardar o livro.",true);
    }finally{
      adminSave.disabled=false;
      adminSave.textContent=adminFields.id.value?"Guardar alterações":"Publicar livro";
    }
  });

  adminList.addEventListener("click",async event=>{
    const editButton=event.target.closest("[data-admin-edit]");
    const deleteButton=event.target.closest("[data-admin-delete]");
    if(editButton){
      const book=adminBookCache.find(item=>String(item.id)===editButton.dataset.adminEdit);
      if(!book)return;
      adminFields.id.value=book.id;
      adminFields.title.value=book.title||"";
      adminFields.author.value=book.author||"";
      adminFields.category.value=book.category||"";
      adminFields.type.value=book.book_type||"gratuito";
      adminFields.price.value=book.price||0;
      adminFields.status.value=book.status||"published";
      adminFields.description.value=book.description||"";
      adminFields.preview.value=book.preview_text||"";
      adminFields.coverPath.value=book.cover_path||"";
      adminFields.filePath.value=book.file_path||"";
      adminFields.cover.value="";
      adminFields.file.value="";
      adminFormTitle.textContent="Editar publicação";
      adminSave.textContent="Guardar alterações";
      adminCancel.hidden=false;
      adminForm.scrollIntoView({behavior:"smooth",block:"start"});
      return;
    }
    if(deleteButton){
      const book=adminBookCache.find(item=>String(item.id)===deleteButton.dataset.adminDelete);
      if(!book||!window.confirm('Tem a certeza de que pretende eliminar "'+book.title+'"?'))return;
      deleteButton.disabled=true;
      try{
        const {error}=await supabaseClient.from("books").delete().eq("id",book.id);
        if(error)throw error;
        if(book.cover_path)await supabaseClient.storage.from("84books-covers").remove([book.cover_path]);
        if(book.file_path)await supabaseClient.storage.from("84books-files").remove([book.file_path]);
        showAdminMessage("Livro eliminado do catálogo.");
        await renderAdminBooks();
        await loadPublicBooks();
      }catch(error){
        showAdminMessage(error.message||"Não foi possível eliminar o livro.",true);
        deleteButton.disabled=false;
      }
    }
  });

  adminCancel.addEventListener("click",resetAdminForm);
  document.getElementById("adminRefreshBooks").addEventListener("click",renderAdminBooks);
  window.addEventListener("84books:admin-open",renderAdminBooks);

  window.addEventListener("84books:download-book",async event=>{
    const path=event.detail&&event.detail.path;
    if(!path||!currentUser){showMessage("Inicie sessão para descarregar este livro gratuito.",true);return;}
    if(current84Role!=="admin"){
      showMessage("O download com anúncio recompensado será ativado quando o fornecedor e a validação segura da recompensa estiverem ligados. O PDF continua protegido.",true);
      return;
    }
    try{
      const {data,error}=await supabaseClient.storage.from("84books-files").createSignedUrl(path,90);
      if(error)throw error;
      if(data&&data.signedUrl)window.open(data.signedUrl,"_blank","noopener");
    }catch(error){showMessage(error.message||"Não foi possível preparar o PDF.",true);}
  });

  memberHome.addEventListener("click",()=>navigate("inicio"));
  window.addEventListener("84books:login-required",()=>{
    setMode("login");
    showOverlay();
    showMessage("Inicie sessão para entrar na sua área de membro.");
  });

  if (!window.supabase || !window.supabase.createClient) {
    showMessage("Não foi possível carregar o serviço de contas. Atualize a página e tente novamente.",true);
    return;
  }
  supabaseClient = window.supabase.createClient(PROJECT_URL,PUBLISHABLE_KEY);
  loadPublicBooks();

  openButton.addEventListener("click",async()=>{
    const result = await supabaseClient.auth.getSession();
    const session = result.data ? result.data.session : null;
    renderSession(session);
    if(session && session.user){
      await openMemberArea(session.user);
    }else{
      setMode("login");
      showOverlay();
    }
  });
  menuSignOut.addEventListener("click",()=>performSignOut(menuSignOut));
  closeButton.addEventListener("click",hideOverlay);
  overlay.addEventListener("click",event=>{if(event.target===overlay)hideOverlay();});
  document.addEventListener("keydown",event=>{if(event.key==="Escape" && overlay.classList.contains("open"))hideOverlay();});
  document.querySelectorAll("[data-auth-mode]").forEach(tab=>tab.addEventListener("click",()=>{setMode(tab.dataset.authMode);renderSession(null);}));

  form.addEventListener("submit",async event=>{
    event.preventDefault();
    const email=emailInput.value.trim();
    const password=passwordInput.value;
    submitButton.disabled=true;
    submitButton.textContent=mode==="signup"?"A criar conta...":"A entrar...";
    showMessage("A comunicar com segurança com o Supabase...");
    try{
      if(mode==="signup"){
        const fullName=fullNameInput.value.trim();
        const {data,error}=await supabaseClient.auth.signUp({email,password,options:{data:{full_name:fullName},emailRedirectTo:window.location.href.split("#")[0]}});
        if(error) throw error;
        if(data.session){
          showMessage("Conta criada com sucesso! Já pode começar a utilizar a sua conta.");
          renderSession(data.session);
          hideOverlay();
          memberArea.hidden = true;
          window.scrollTo({top:0,behavior:"smooth"});
        }else{
          showMessage("Conta criada! Verifique a sua caixa de e-mail e confirme o endereço antes de iniciar sessão.");
          resendButton.hidden = false;
        }
      }else{
        const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
        if(error) throw error;
        showMessage("Sessão iniciada com sucesso.");
        renderSession(data.session);
        hideOverlay();
        memberArea.hidden = true;
        window.scrollTo({top:0,behavior:"smooth"});
      }
    }catch(error){
      showMessage(error.message || "Ocorreu um erro. Tente novamente.",true);
      if(mode === "login" && /email.*not confirmed|not confirmed.*email/i.test(error.message || "")) resendButton.hidden = false;
    }
    finally{submitButton.disabled=false;submitButton.textContent=mode==="signup"?"Criar a minha conta":"Entrar na minha conta";}
  });

  resendButton.addEventListener("click",async()=>{
    const email=emailInput.value.trim();
    if(!email){showMessage("Introduza o seu e-mail no campo acima.",true);emailInput.focus();return;}
    resendButton.disabled=true;
    const originalText=resendButton.textContent;
    resendButton.textContent="A enviar...";
    try{
      const {error}=await supabaseClient.auth.resend({type:"signup",email,options:{emailRedirectTo:window.location.href.split("#")[0]}});
      if(error)throw error;
      showMessage("Pedido enviado. Verifique a caixa de entrada e também as pastas de spam ou lixo eletrónico.");
    }catch(error){showMessage(error.message || "Não foi possível reenviar a confirmação. Aguarde um pouco e tente novamente.",true);}
    finally{resendButton.disabled=false;resendButton.textContent=originalText;}
  });

  forgotButton.addEventListener("click",async()=>{
    const email=emailInput.value.trim();
    if(!email){showMessage("Introduza primeiro o seu e-mail no campo acima.",true);emailInput.focus();return;}
    forgotButton.disabled=true;
    try{
      const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:window.location.href.split("#")[0]});
      if(error)throw error;
      showMessage("Se o endereço estiver registado, receberá um e-mail com as instruções para redefinir a palavra-passe.");
    }catch(error){showMessage(error.message || "Não foi possível enviar o pedido.",true);}
    finally{forgotButton.disabled=false;}
  });

  async function performSignOut(button){
    button.disabled=true;
    const {error}=await supabaseClient.auth.signOut();
    button.disabled=false;
    if(error){showMessage(error.message,true);return;}
    memberArea.hidden=true;
    renderSession(null);
    setMode("login");
    showMessage("Terminou a sessão com sucesso.");
    hideOverlay();
    navigate("inicio");
  }
  signOutButton.addEventListener("click",()=>performSignOut(signOutButton));

  supabaseClient.auth.onAuthStateChange((event,session)=>{
    renderSession(session);
    if(session&&session.user){
      Promise.resolve().then(async()=>{
        await loadMemberProfile(session.user);
        authReady=true;
        if(event==="SIGNED_IN"){
          hideOverlay();
          memberArea.hidden=true;
          navigate("inicio");
        }else{
          renderRoute();
        }
      });
    }else{
      current84Role="reader";
      setAdminVisibility();
      authReady=true;
      renderRoute();
    }
  });

  supabaseClient.auth.getSession().then(async({data})=>{
    renderSession(data.session);
    if(data.session&&data.session.user)await loadMemberProfile(data.session.user);
    authReady=true;
    renderRoute();
  });
})();