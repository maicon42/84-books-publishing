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
    const price = book.type==="gratuito"?"Grátis":book.type==="pago"?(Number(book.price)>0?Number(book.price).toLocaleString("pt-AO")+" Kz":"Pago"):"Em preparação";
    return '<article class="book-card" data-book-card="'+escapeHTML(book.id)+'" role="link" tabindex="0" aria-label="Abrir detalhes de '+escapeHTML(book.title)+'">'+
      '<div class="cover-wrap">'+cover+tag+
        '<button class="favorite-btn '+(isFavorite?"is-favorite":"")+'" data-favorite="'+escapeHTML(book.id)+'" aria-label="'+(isFavorite?"Remover dos favoritos":"Adicionar aos favoritos")+'">'+(isFavorite?"♥":"♡")+'</button>'+
      '</div><div class="book-info"><span class="book-category">'+escapeHTML(book.category||"Geral")+'</span><h3>'+escapeHTML(book.title)+'</h3><p class="book-author">Por '+escapeHTML(book.author)+'</p><div class="book-bottom"><span class="book-price">'+price+'</span><button class="book-open" data-open="'+escapeHTML(book.id)+'">Ver detalhes →</button></div></div></article>';
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
  const canDownload=book.type==="gratuito"&&!!book.filePath;
  container.innerHTML=
    '<div class="detail-topbar"><button class="detail-back" id="detailBack" type="button">← Voltar à biblioteca</button><span>84 BOOKS PUBLISHING / CATÁLOGO</span></div>'+
    '<div class="book-detail-layout"><div class="detail-cover-wrap">'+cover+'</div><div class="book-detail-copy">'+
    '<span class="detail-category">'+escapeHTML(book.category||"Geral")+'</span><span class="detail-status">'+escapeHTML(tag)+'</span>'+
    '<h1>'+escapeHTML(book.title)+'</h1><p class="detail-author">Por '+escapeHTML(book.author)+'</p>'+
    '<p class="detail-description">'+escapeHTML(description)+'</p>'+
    '<div class="detail-meta"><span>EDITORA</span><strong>84 Books Publishing</strong><span>ACESSO</span><strong>'+(book.type==="gratuito"?"Gratuito":book.type==="pago"?(Number(book.price)>0?Number(book.price).toLocaleString("pt-AO")+" Kz":"Pago"):"Em preparação")+'</strong></div>'+
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


// 84 Books Publishing — autenticação real com Supabase
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
  const memberArea = document.getElementById("memberArea");
  const memberName = document.getElementById("memberName");
  const memberHome = document.getElementById("memberHome");
  const memberSignOut = document.getElementById("memberSignOut");
  const profileForm = document.getElementById("profileForm");
  const profileMessage = document.getElementById("profileMessage");
  const profileSave = document.getElementById("profileSave");
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
  function showMessage(text, isError){ message.textContent = text || ""; message.classList.toggle("error",!!isError); }
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
  function showOverlay(){ overlay.classList.add("open"); overlay.setAttribute("aria-hidden","false"); document.body.style.overflow="hidden"; }
  function hideOverlay(){ overlay.classList.remove("open"); overlay.setAttribute("aria-hidden","true"); document.body.style.overflow=""; }
  function renderSession(session){
    const user = session && session.user;
    currentUser = user || null;
    current84User = currentUser;
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
    }
  }

  async function openMemberArea(user){
    if(!user) return;
    memberArea.hidden = false;
    hideOverlay();
    navigate("membros/profile");
    await loadMemberProfile(user);
  }

  async function loadMemberProfile(user){
    profileMessage.textContent = "A carregar o seu perfil...";
    const {data,error} = await supabaseClient
      .from("profiles")
      .select("full_name, display_name, phone, country, gender, birth_date, profile_type, bio")
      .eq("id",user.id)
      .maybeSingle();
    if(error){
      profileMessage.textContent = "O perfil ainda precisa da atualização da base de dados. Execute o ficheiro supabase/member-area.sql no SQL Editor.";
      profileMessage.classList.add("error");
      const metaName = user.user_metadata && user.user_metadata.full_name;
      profileFields.fullName.value = metaName || "";
      memberName.textContent = metaName || "leitor";
      return;
    }
    profileMessage.textContent = "";
    profileMessage.classList.remove("error");
    const profile = data || {};
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
  }

  // A navegação das abas da área de membro é controlada pelo router interno.

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
      profileMessage.textContent = "Perfil guardado com sucesso.";
    }catch(error){
      profileMessage.textContent = error.message || "Não foi possível guardar o perfil.";
      profileMessage.classList.add("error");
    }finally{
      profileSave.disabled=false;
      profileSave.textContent="Guardar perfil";
    }
  });

  memberHome.addEventListener("click",()=>navigate("inicio"));
  window.addEventListener("84books:login-required",()=>{setMode("login");showOverlay();showMessage("Inicie sessão para entrar na sua área de membro.");});
  if (!window.supabase || !window.supabase.createClient) {
    showMessage("Não foi possível carregar o serviço de contas. Atualize a página e tente novamente.",true);
    return;
  }
  supabaseClient = window.supabase.createClient(PROJECT_URL,PUBLISHABLE_KEY);
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
  memberSignOut.addEventListener("click",()=>performSignOut(memberSignOut));
  supabaseClient.auth.onAuthStateChange((event,session)=>{
    renderSession(session); authReady=true;
    if(event==="SIGNED_IN" && session){hideOverlay();memberArea.hidden=true;navigate("inicio");}
    else renderRoute();
  });
  supabaseClient.auth.getSession().then(({data})=>{renderSession(data.session);authReady=true;renderRoute();});
})();
