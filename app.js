const demoBooks = [
  {id:1,title:"O Poder da Leitura",author:"84 Books Publishing",category:"Desenvolvimento pessoal",type:"gratuito",price:"Grátis",tone:"tone-one",status:"Disponível",excerpt:"A leitura é uma das ferramentas mais poderosas para transformar a maneira como vemos o mundo. Cada página oferece uma oportunidade de aprender, questionar e crescer.\n\nLer não é apenas reconhecer palavras: é construir ideias, desenvolver a imaginação e descobrir caminhos que antes pareciam impossíveis.\n\nNa 84 Books Publishing, acreditamos que o conhecimento deve circular e alcançar pessoas de diferentes lugares."},
  {id:2,title:"Caminhos da Coragem",author:"84 Books Publishing",category:"Motivação",type:"pago",price:"Em breve",tone:"tone-two",status:"Disponível",excerpt:"A coragem não significa ausência de medo. Significa encontrar uma razão para continuar, mesmo quando o caminho exige esforço.\n\nEste livro fará parte do catálogo oficial da editora. A versão completa e as informações de compra serão anunciadas quando a publicação estiver pronta."},
  {id:3,title:"Pequenas Grandes Ideias",author:"84 Books Publishing",category:"Conhecimento",type:"gratuito",price:"Grátis",tone:"tone-three",status:"Disponível",excerpt:"Uma ideia pode começar pequena e, com dedicação, transformar-se em algo extraordinário. O conhecimento cresce quando é partilhado.\n\nEste espaço de leitura apresenta uma pequena amostra do tipo de conteúdo que a 84 Books Publishing pretende oferecer aos seus leitores."},
  {id:4,title:"O Futuro Começa Hoje",author:"84 Books Publishing",category:"Educação",type:"breve",price:"Em preparação",tone:"tone-four",status:"Em preparação",excerpt:"Este título está em preparação pela equipa editorial. Em breve, esta página apresentará a descrição, os detalhes da publicação e a data prevista de lançamento."},
  {id:5,title:"Além das Fronteiras",author:"84 Books Publishing",category:"Literatura",type:"pago",price:"Em breve",tone:"tone-five",status:"Disponível",excerpt:"Histórias atravessam fronteiras, aproximam culturas e mostram que a experiência humana tem muitas vozes.\n\nA publicação está a ser preparada. Os detalhes da edição e o acesso integral serão anunciados em breve."},
  {id:6,title:"Aprender Sempre",author:"84 Books Publishing",category:"Educação",type:"gratuito",price:"Grátis",tone:"tone-six",status:"Disponível",excerpt:"Aprender é um processo que acompanha toda a vida. A curiosidade ajuda-nos a fazer perguntas melhores e a encontrar respostas mais completas.\n\nEste pequeno texto é uma demonstração do leitor digital da 84 Books Publishing."}
];
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
const grid = document.getElementById("bookGrid");
const search = document.getElementById("searchInput");
const empty = document.getElementById("emptyState");

function bookKey(id){return typeof id==="number"?id:String(id);}
function parseBookId(value){return /^\d+$/.test(String(value))?Number(value):String(value);}
function bookPriceLabel(book){if(typeof book.price==="string")return book.price;if(book.type==="gratuito")return "Grátis";if(book.type==="pago")return Number(book.price)>0?Number(book.price).toLocaleString("pt-AO")+" Kz":"Pago";return "Em preparação";}
function renderHomeGreeting(name){
  const greeting=document.getElementById("homeGreeting");
  if(!greeting)return;
  const user=current84User;
  if(!user){
    greeting.textContent="Bem-vindo à 84 Books Publishing.";
    return;
  }
  const metadataName=user.user_metadata&&user.user_metadata.full_name;
  const displayName=String(name||metadataName||(user.email||"").split("@")[0]||"leitor").trim();
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

function renderBooks(){
  const term = search.value.trim().toLocaleLowerCase("pt");
  const visible = books.filter(book => {
    const matchesText = (book.title+" "+book.author+" "+book.category).toLocaleLowerCase("pt").includes(term);
    const matchesFilter = activeFilter === "todos" ||
      (activeFilter === "favoritos" && favorites.has(bookKey(book.id))) ||
      (activeFilter !== "favoritos" && book.type === activeFilter);
    return matchesText && matchesFilter;
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
  renderHome();
}
document.getElementById("filterList").addEventListener("click", event => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll(".filter-chip").forEach(chip => chip.classList.toggle("selected", chip === button));
  renderBooks();
});
search.addEventListener("input", renderBooks);
const homeCategories=document.getElementById("homeCategories");
if(homeCategories){
  homeCategories.addEventListener("click",event=>{
    const button=event.target.closest("[data-home-category]");
    if(!button)return;
    activeFilter="todos";
    search.value=button.dataset.homeCategory||"";
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
  const canDownload=book.type==="gratuito"&&!!book.filePath&&!!current84User;
  container.innerHTML=
    '<div class="detail-topbar"><button class="detail-back" id="detailBack" type="button">← Voltar à biblioteca</button><span>84 BOOKS PUBLISHING / CATÁLOGO</span></div>'+
    '<div class="book-detail-layout"><div class="detail-cover-wrap">'+cover+'</div><div class="book-detail-copy">'+
    '<span class="detail-category">'+escapeHTML(book.category||"Geral")+'</span><span class="detail-status">'+escapeHTML(tag)+'</span>'+
    '<h1>'+escapeHTML(book.title)+'</h1><p class="detail-author">Por '+escapeHTML(book.author)+'</p>'+
    '<p class="detail-description">'+escapeHTML(description)+'</p>'+
    '<div class="detail-meta"><span>EDITORA</span><strong>84 Books Publishing</strong><span>ACESSO</span><strong>'+escapeHTML(bookPriceLabel(book))+'</strong></div>'+
    '<div class="detail-actions">'+(book.type==="breve"?'<span class="detail-coming">Publicação em preparação</span>':'<button class="button button-primary" id="detailPreviewToggle" type="button">Ler prévia <span>→</span></button>')+
    (canDownload?'<button class="detail-favorite" id="detailDownload" type="button">↓ Descarregar PDF</button>':"")+
    '<button class="detail-favorite" id="detailFavorite" type="button">'+(favorites.has(bookKey(book.id))?"♥ Guardado nos favoritos":"♡ Adicionar aos favoritos")+'</button></div>'+
    '<p class="detail-note">'+escapeHTML(accessNote)+'</p></div></div>'+
    '<section class="detail-preview" id="detailPreview" hidden><span class="detail-category">PRÉ-VISUALIZAÇÃO</span><h2>Abra as primeiras páginas.</h2><p id="detailPreviewText"></p><p class="detail-note">Esta é uma amostra disponibilizada pela editora.</p></section>';
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
  const downloadButton=document.getElementById("detailDownload");
  if(downloadButton)downloadButton.addEventListener("click",()=>window.dispatchEvent(new CustomEvent("84books:download-book",{detail:{path:book.filePath}})));
}
let current84User=null,authReady=false,current84Role="reader";
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
    currentUser = user || null;
    current84User = currentUser;
    renderHomeGreeting();
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
      books=[...demoBooks];
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
    books=[...demoBooks,...remote];
    renderBooks();
    renderHome();
    if(window.location.hash.startsWith("#/livro/")){
      const id=decodeURIComponent(window.location.hash.split("/")[2]||"");
      renderBookDetail(parseBookId(id));
    }
  }

  async function loadMemberProfile(user){
    profileMessage.textContent = "A carregar o seu perfil...";
    const {data,error} = await supabaseClient
      .from("profiles")
      .select("full_name, display_name, phone, country, gender, birth_date, profile_type, bio, role")
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
      renderHomeGreeting(metaName);
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
    renderHomeGreeting(profile.display_name || profile.full_name || profileFields.fullName.value);
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