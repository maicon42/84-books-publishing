const books = [
  {id:1,title:"O Poder da Leitura",author:"84 Books Publishing",category:"Desenvolvimento pessoal",type:"gratuito",price:"Grátis",tone:"tone-one",status:"Disponível",excerpt:"A leitura é uma das ferramentas mais poderosas para transformar a maneira como vemos o mundo. Cada página oferece uma oportunidade de aprender, questionar e crescer.\n\nLer não é apenas reconhecer palavras: é construir ideias, desenvolver a imaginação e descobrir caminhos que antes pareciam impossíveis.\n\nNa 84 Books Publishing, acreditamos que o conhecimento deve circular e alcançar pessoas de diferentes lugares."},
  {id:2,title:"Caminhos da Coragem",author:"84 Books Publishing",category:"Motivação",type:"pago",price:"Em breve",tone:"tone-two",status:"Disponível",excerpt:"A coragem não significa ausência de medo. Significa encontrar uma razão para continuar, mesmo quando o caminho exige esforço.\n\nEste livro fará parte do catálogo oficial da editora. A versão completa e as informações de compra serão anunciadas quando a publicação estiver pronta."},
  {id:3,title:"Pequenas Grandes Ideias",author:"84 Books Publishing",category:"Conhecimento",type:"gratuito",price:"Grátis",tone:"tone-three",status:"Disponível",excerpt:"Uma ideia pode começar pequena e, com dedicação, transformar-se em algo extraordinário. O conhecimento cresce quando é partilhado.\n\nEste espaço de leitura apresenta uma pequena amostra do tipo de conteúdo que a 84 Books Publishing pretende oferecer aos seus leitores."},
  {id:4,title:"O Futuro Começa Hoje",author:"84 Books Publishing",category:"Educação",type:"breve",price:"Em preparação",tone:"tone-four",status:"Em preparação",excerpt:"Este título está em preparação pela equipa editorial. Em breve, esta página apresentará a descrição, os detalhes da publicação e a data prevista de lançamento."},
  {id:5,title:"Além das Fronteiras",author:"84 Books Publishing",category:"Literatura",type:"pago",price:"Em breve",tone:"tone-five",status:"Disponível",excerpt:"Histórias atravessam fronteiras, aproximam culturas e mostram que a experiência humana tem muitas vozes.\n\nA publicação está a ser preparada. Os detalhes da edição e o acesso integral serão anunciados em breve."},
  {id:6,title:"Aprender Sempre",author:"84 Books Publishing",category:"Educação",type:"gratuito",price:"Grátis",tone:"tone-six",status:"Disponível",excerpt:"Aprender é um processo que acompanha toda a vida. A curiosidade ajuda-nos a fazer perguntas melhores e a encontrar respostas mais completas.\n\nEste pequeno texto é uma demonstração do leitor digital da 84 Books Publishing."}
];
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
    savePreference("84books-favorites", JSON.stringify([...favorites]));
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

// Alternância de tema — tratamento reforçado para telemóveis.
(function setup84Theme(){
  const button = document.getElementById("themeToggle");
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
    form.hidden = !!user;
    forgotButton.hidden = !!user || mode === "signup";
    resendButton.hidden = !!user || mode === "signup";
    sessionPanel.hidden = !user;
    openButton.textContent = user ? "A minha conta" : "Entrar / Criar conta";
    if(user){
      const name = user.user_metadata && user.user_metadata.full_name;
      welcome.textContent = "Sessão iniciada como " + (name || user.email || "leitor") + ". A sua conta está ligada à 84 Books Publishing.";
      showMessage("");
    }
  }
  if (!window.supabase || !window.supabase.createClient) {
    showMessage("Não foi possível carregar o serviço de contas. Atualize a página e tente novamente.",true);
    return;
  }
  supabaseClient = window.supabase.createClient(PROJECT_URL,PUBLISHABLE_KEY);
  openButton.addEventListener("click",async()=>{
    showOverlay();
    const result = await supabaseClient.auth.getSession();
    renderSession(result.data ? result.data.session : null);
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
        }else{
          showMessage("Conta criada! Verifique a sua caixa de e-mail e confirme o endereço antes de iniciar sessão.");
          resendButton.hidden = false;
        }
      }else{
        const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
        if(error) throw error;
        showMessage("Sessão iniciada com sucesso.");
        renderSession(data.session);
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
  signOutButton.addEventListener("click",async()=>{
    signOutButton.disabled=true;
    const {error}=await supabaseClient.auth.signOut();
    signOutButton.disabled=false;
    if(error){showMessage(error.message,true);return;}
    renderSession(null);setMode("login");showMessage("Terminou a sessão com sucesso.");
  });
  supabaseClient.auth.onAuthStateChange((_event,session)=>renderSession(session));
  supabaseClient.auth.getSession().then(({data})=>renderSession(data.session));
})();
