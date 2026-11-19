(function(){
  "use strict";
  const PROJECT_URL="https://ruvtjfryrrbjtctgvwtc.supabase.co";
  const PUBLISHABLE_KEY="sb_publishable_44W6KLQQbzEAbIdI2YZASg_uoJzm2-C";
  const $=id=>document.getElementById(id);
  const form=$("authForm"),signup=$("signupFields"),identifierInput=$("authEmail"),password=$("authPassword");
  const overlay=$("authOverlay");
  if(!form||!window.supabase)return;
  const client=window.supabase.createClient(PROJECT_URL,PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const fallbackCountries=[
    ["Afeganistão","+93"],["África do Sul","+27"],["Albânia","+355"],["Alemanha","+49"],["Andorra","+376"],["Angola","+244"],["Arábia Saudita","+966"],["Argélia","+213"],["Argentina","+54"],["Austrália","+61"],["Áustria","+43"],["Bélgica","+32"],["Brasil","+55"],["Cabo Verde","+238"],["Canadá","+1"],["China","+86"],["Colômbia","+57"],["Coreia do Sul","+82"],["Cuba","+53"],["Dinamarca","+45"],["Egito","+20"],["Espanha","+34"],["Estados Unidos","+1"],["Etiópia","+251"],["Filipinas","+63"],["Finlândia","+358"],["França","+33"],["Gana","+233"],["Guiné-Bissau","+245"],["Índia","+91"],["Indonésia","+62"],["Irlanda","+353"],["Israel","+972"],["Itália","+39"],["Japão","+81"],["Quénia","+254"],["Marrocos","+212"],["Moçambique","+258"],["Namíbia","+264"],["Nigéria","+234"],["Noruega","+47"],["Países Baixos","+31"],["Paquistão","+92"],["Peru","+51"],["Polónia","+48"],["Portugal","+351"],["Reino Unido","+44"],["República Democrática do Congo","+243"],["Rússia","+7"],["São Tomé e Príncipe","+239"],["Senegal","+221"],["Suécia","+46"],["Suíça","+41"],["Tanzânia","+255"],["Timor-Leste","+670"],["Turquia","+90"],["Ucrânia","+380"],["Zâmbia","+260"],["Zimbabwe","+263"]
  ];
  let countries=[...fallbackCountries];
  const fieldFor=id=>$(id)?.closest(".auth-field");
  const countryLabel=fieldFor("authCountry"),phoneLabel=fieldFor("authPhone"),passwordLabel=password.closest(".auth-field");
  const emailLabel=identifierInput.closest(".auth-field");
  const emailCaption=emailLabel?.firstChild;
  const fullName=$("authFullName"),displayName=$("authDisplayName"),birthDate=$("authBirthDate"),profileType=$("authProfileType");
  const originalPhone=$("authPhone");
  let countrySelect=null,dialSelect=null,confirmInput=null,confirmLabel=null;
  function makeSelect(id,labelText){
    const select=document.createElement("select");select.id=id;select.required=true;select.setAttribute("aria-label",labelText);return select;
  }
  if(countryLabel){
    const old=$("authCountry");
    const wrapper=document.createElement("div");wrapper.className="auth-country-picker";
    const search=document.createElement("input");search.type="search";search.id="authCountrySearch";search.placeholder="Pesquisar país...";search.autocomplete="off";search.setAttribute("aria-label","Pesquisar país");
    countrySelect=makeSelect("authCountry","Selecionar país");
    const placeholder=document.createElement("option");placeholder.value="";placeholder.textContent="Selecione o seu país";placeholder.disabled=true;placeholder.selected=true;countrySelect.appendChild(placeholder);
    old.replaceWith(wrapper);wrapper.append(search,countrySelect);
    search.addEventListener("input",()=>{
      const term=search.value.trim().toLocaleLowerCase("pt");
      const current=countrySelect.value;
      const filtered=countries.filter(([name])=>name.toLocaleLowerCase("pt").includes(term));
      fillCountryOptions(filtered,current);
      countrySelect.size=filtered.length>0&&term?Math.min(filtered.length+1,6):1;
    });
    search.addEventListener("focus",()=>{if(search.value)search.dispatchEvent(new Event("input"));});
    countrySelect.addEventListener("change",()=>{
      const chosen=countries.find(([name])=>name===countrySelect.value);
      if(chosen&&dialSelect)dialSelect.value=chosen[1];
      clearError(countrySelect);
      if(search)search.value=countrySelect.value;
      countrySelect.size=1;
    });
    function fillCountryOptions(rows,selected){
      countrySelect.replaceChildren();
      const placeholder=document.createElement("option");placeholder.value="";placeholder.textContent="Selecione o seu país";placeholder.disabled=true;placeholder.selected=!selected;countrySelect.appendChild(placeholder);
      rows.forEach(([name,dial])=>{const option=document.createElement("option");option.value=name;option.textContent=name;option.dataset.dial=dial;if(name===selected)option.selected=true;countrySelect.appendChild(option);});
    }
    fillCountryOptions(countries,"");
  }
  if(phoneLabel){
    originalPhone.type="tel";originalPhone.placeholder="Digite apenas o seu número";originalPhone.autocomplete="tel-national";
    originalPhone.inputMode="tel";
    const row=document.createElement("div");row.className="auth-phone-row";
    dialSelect=makeSelect("authDialCode","Indicativo internacional");
    originalPhone.parentNode.insertBefore(row,originalPhone);row.append(dialSelect,originalPhone);
    originalPhone.setAttribute("aria-label","Número de telefone sem indicativo");
    const hint=document.createElement("small");hint.className="auth-field-hint";hint.textContent="O indicativo é preenchido automaticamente ao escolher o país. Também pode selecioná-lo aqui.";
    phoneLabel.appendChild(hint);
    dialSelect.addEventListener("change",()=>clearError(dialSelect));
  }
  function fillDialOptions(rows,selectedCountry){
    if(!dialSelect)return;
    const selectedCode=dialSelect.value;
    dialSelect.replaceChildren();
    rows.forEach(([name,dial])=>{
      const option=document.createElement("option");option.value=dial;option.textContent=dial+" · "+name;
      if(name===selectedCountry)option.selected=true;
      dialSelect.appendChild(option);
    });
    if(!selectedCountry&&[...dialSelect.options].some(o=>o.value===selectedCode))dialSelect.value=selectedCode;
  }
  fillDialOptions(countries,"Angola");
  if(countrySelect){
    countrySelect.value="";
    const search=$("authCountrySearch");
    fetch("https://restcountries.com/v3.1/all?fields=name,idd")
      .then(response=>{if(!response.ok)throw new Error("country list");return response.json();})
      .then(rows=>{
        const all=(rows||[]).map(item=>{
          const name=item.name?.common,root=item.idd?.root,suffixes=item.idd?.suffixes||[];
          if(!name||!root)return null;
          const dial=root+(suffixes.length===1?suffixes[0]:"");
          return [name,dial];
        }).filter(Boolean);
        const unique=[...new Map(all.map(item=>[item[0].toLocaleLowerCase("pt"),item])).values()].sort((a,b)=>a[0].localeCompare(b[0],"pt"));
        if(!unique.length)return;
        countries=unique;
        const chosen=countrySelect.value;
        const term=search.value.trim().toLocaleLowerCase("pt");
        const visible=countries.filter(([name])=>name.toLocaleLowerCase("pt").includes(term));
        countrySelect.replaceChildren();
        const placeholder=document.createElement("option");placeholder.value="";placeholder.textContent="Selecione o seu país";placeholder.disabled=true;placeholder.selected=!chosen;countrySelect.appendChild(placeholder);
        visible.forEach(([name])=>{const o=document.createElement("option");o.value=name;o.textContent=name;if(name===chosen)o.selected=true;countrySelect.appendChild(o);});
        fillDialOptions(countries,chosen);
      }).catch(()=>{});
  }
  if(displayName&&fullName)signup.insertBefore(displayName.closest(".auth-field"),fullName.closest(".auth-field"));
  if(phoneLabel&&birthDate)signup.insertBefore(phoneLabel,birthDate.closest(".auth-field"));
  if(birthDate&&profileType){
    const genderLabel=document.createElement("label");genderLabel.className="auth-field";genderLabel.textContent="Género";
    const gender=makeSelect("authGender","Género");
    [["","Selecione o seu género"],["Feminino","Feminino"],["Masculino","Masculino"],["Outro","Outro"],["Prefiro não informar","Prefiro não informar"]].forEach(([v,t])=>{const o=document.createElement("option");o.value=v;o.textContent=t;gender.appendChild(o);});
    genderLabel.appendChild(gender);signup.insertBefore(genderLabel,birthDate.closest(".auth-field"));
  }
  const gender=$("authGender");
  if(profileType){
    [["promoter","Promotor"],["sponsor","Patrocinador"],["agent","Agente"],["explorer","Explorador"],["listener","Ouvinte"],["art_lover","Amante da leitura"]].forEach(([v,t])=>{if(![...profileType.options].some(o=>o.value===v)){const o=document.createElement("option");o.value=v;o.textContent=t;profileType.appendChild(o);}});
  }
  confirmLabel=document.createElement("label");confirmLabel.className="auth-field";confirmLabel.id="authConfirmLabel";confirmLabel.textContent="Confirmar palavra-passe";
  confirmInput=document.createElement("input");confirmInput.id="authPasswordConfirm";confirmInput.type="password";confirmInput.autocomplete="new-password";confirmInput.minLength=8;confirmInput.placeholder="Digite novamente a palavra-passe";
  confirmLabel.appendChild(confirmInput);passwordLabel.after(confirmLabel);confirmLabel.hidden=true;
  function addPasswordToggle(input){
    const wrap=document.createElement("div");wrap.className="auth-password-wrap";input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);
    const button=document.createElement("button");button.type="button";button.className="auth-password-toggle";button.textContent="Mostrar";
    button.addEventListener("click",()=>{const show=input.type==="password";input.type=show?"text":"password";button.textContent=show?"Ocultar":"Mostrar";});wrap.appendChild(button);
  }
  addPasswordToggle(password);addPasswordToggle(confirmInput);
  const errorNodes=new Map();
  function errorNode(field){
    if(errorNodes.has(field))return errorNodes.get(field);
    const node=document.createElement("small");node.className="auth-inline-error";node.setAttribute("aria-live","polite");
    const parent=field.closest(".auth-field")||field.parentElement;parent.appendChild(node);errorNodes.set(field,node);return node;
  }
  function setError(field,message){
    if(!field)return;
    field.setAttribute("aria-invalid","true");errorNode(field).textContent=message;
  }
  function clearError(field){
    if(!field)return;
    field.removeAttribute("aria-invalid");
    const node=errorNodes.get(field);if(node)node.textContent="";
  }
  function clearAllErrors(){[...errorNodes.keys()].forEach(clearError);const m=$("authMessage");if(m)m.textContent="";}
  [identifierInput,password,confirmInput,fullName,displayName,countrySelect,$("authCountrySearch"),dialSelect,originalPhone,gender,birthDate,profileType].filter(Boolean).forEach(field=>{
    field.addEventListener("input",()=>clearError(field));field.addEventListener("change",()=>clearError(field));
  });
  function isSignup(){return document.querySelector('[data-auth-mode].active')?.dataset.authMode==="signup";}
  function configureMode(){
    const signupMode=isSignup();
    identifierInput.type=signupMode?"email":"text";
    identifierInput.autocomplete=signupMode?"email":"username";
    identifierInput.placeholder=signupMode?"O seu endereço de e-mail":"Nome de utilizador, e-mail ou telefone";
    if(emailCaption&&emailCaption.nodeType===Node.TEXT_NODE)emailCaption.textContent=signupMode?"E-mail":"Nome de utilizador, e-mail ou telefone";
    password.autocomplete=signupMode?"new-password":"current-password";
    password.minLength=signupMode?8:1;
    confirmLabel.hidden=!signupMode;confirmInput.required=signupMode;
    const submit=$("authSubmit");if(submit)submit.textContent=signupMode?"Criar a minha conta":"Iniciar sessão";
    const forgot=$("forgotPassword");if(forgot)forgot.hidden=signupMode;
    const countrySearch=$("authCountrySearch");if(countrySearch)countrySearch.required=false;
    clearAllErrors();
  }
  document.addEventListener("click",event=>{if(event.target.closest("[data-auth-mode]"))setTimeout(configureMode,0);});
  function setMessage(text,isError){
    const node=$("authMessage");if(node){node.textContent=text||"";node.classList.toggle("error",!!isError);}
  }
  function ageAtLeast13(value){
    if(!value)return false;
    const d=new Date(value+"T00:00:00"),now=new Date();if(Number.isNaN(d.getTime())||d>now)return false;
    let age=now.getFullYear()-d.getFullYear();if(now.getMonth()<d.getMonth()||(now.getMonth()===d.getMonth()&&now.getDate()<d.getDate()))age--;return age>=13;
  }
  function validateSignup(){
    clearAllErrors();let first=null;
    const required=[
      [displayName,"Indique o nome que será apresentado no seu perfil."],
      [fullName,"Indique o seu nome completo, conforme o documento."],
      [countrySelect,"Pesquise e selecione o seu país na lista."],
      [dialSelect,"Selecione o indicativo do seu país."],
      [originalPhone,"Introduza o seu número de telefone."],
      [gender,"Selecione o seu género ou escolha «Prefiro não informar»."],
      [birthDate,"Indique a sua data de nascimento."],
      [identifierInput,"Introduza o seu endereço de e-mail."],
      [password,"Crie uma palavra-passe."],
      [confirmInput,"Confirme a palavra-passe."]
    ];
    required.forEach(([field,message])=>{if(field&&!String(field.value||"").trim()){setError(field,message);first=first||field;}});
    if(displayName&&displayName.value.trim().length<3){setError(displayName,"O nome público deve ter pelo menos 3 caracteres.");first=first||displayName;}
    if(countrySelect&&countrySelect.value&&!countries.some(([name])=>name===countrySelect.value)){setError(countrySelect,"Selecione um país válido da lista.");first=first||countrySelect;}
    if(originalPhone&&originalPhone.value.trim()&&!/^\d[\d\s()\-]{5,}$/.test(originalPhone.value.trim())){setError(originalPhone,"Introduza apenas os algarismos do seu número, sem o indicativo.");first=first||originalPhone;}
    if(birthDate&&birthDate.value&&!ageAtLeast13(birthDate.value)){setError(birthDate,"A data deve ser válida e indicar uma idade mínima de 13 anos.");first=first||birthDate;}
    if(identifierInput&&identifierInput.value.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifierInput.value.trim())){setError(identifierInput,"Introduza um endereço de e-mail válido.");first=first||identifierInput;}
    if(password&&password.value.length<8){setError(password,"A palavra-passe deve ter pelo menos 8 caracteres.");first=first||password;}
    if(confirmInput&&password.value!==confirmInput.value){setError(confirmInput,"As palavras-passe não coincidem. Digite exatamente a mesma palavra-passe.");first=first||confirmInput;}
    if(first){setMessage("Há campos por corrigir. Verifique as mensagens junto dos campos assinalados.",true);first.focus();first.scrollIntoView({behavior:"smooth",block:"center"});return false;}
    return true;
  }
  form.addEventListener("submit",async event=>{
    event.preventDefault();event.stopImmediatePropagation();
    clearAllErrors();
    const signupMode=isSignup(),value=identifierInput.value.trim(),pass=password.value,submit=$("authSubmit");
    if(signupMode){
      if(!validateSignup())return;
      submit.disabled=true;submit.textContent="A criar conta...";
      try{
        const metadata={
          full_name:fullName.value.trim(),display_name:displayName.value.trim(),
          username:displayName.value.trim().toLowerCase(),country:countrySelect.value,
          phone:dialSelect.value+" "+originalPhone.value.trim(),gender:gender.value,
          birth_date:birthDate.value,profile_type:profileType.value
        };
        const {data,error}=await client.auth.signUp({email:value,password:pass,options:{data:metadata,emailRedirectTo:window.location.href.split("#")[0]}});
        if(error)throw error;
        if(data.session){await client.auth.setSession({access_token:data.session.access_token,refresh_token:data.session.refresh_token});setMessage("Conta criada com sucesso. A abrir a sua área pessoal...");window.location.reload();}
        else setMessage("Conta criada! Enviámos um link para confirmar o seu e-mail. Abra esse link para ativar a conta e depois inicie sessão.");
      }catch(error){
        const message=error.message||"Não foi possível criar a conta. Verifique os dados e tente novamente.";
        if(/username|profiles_username|duplicate key|unique/i.test(message)){setError(displayName,"Este nome já está a ser utilizado. Escolha outro nome público.");setMessage("O nome de utilizador já existe. Escolha outro.",true);displayName.focus();}
        else setMessage(message,true);
      }finally{submit.disabled=false;submit.textContent="Criar a minha conta";}
      return;
    }
    if(!value||!pass){if(!value)setError(identifierInput,"Indique o nome de utilizador, e-mail ou telefone.");if(!pass)setError(password,"Indique a sua palavra-passe.");setMessage("Preencha os dois campos para iniciar sessão.",true);return;}
    submit.disabled=true;submit.textContent="A verificar...";
    try{
      const {data,error}=await client.functions.invoke("login-with-username",{body:{identifier:value,password:pass}});
      if(error)throw error;
      if(!data?.access_token||!data?.refresh_token)throw new Error(data?.error||"Dados de acesso inválidos. Verifique e tente novamente.");
      const {error:sessionError}=await client.auth.setSession({access_token:data.access_token,refresh_token:data.refresh_token});
      if(sessionError)throw sessionError;
      setMessage("Sessão iniciada. A abrir a sua área pessoal...");window.location.reload();
    }catch(error){setMessage(error.message||"Dados de acesso inválidos. Verifique e tente novamente.",true);}
    finally{submit.disabled=false;submit.textContent="Iniciar sessão";}
  },true);
  const forgot=$("forgotPassword");
  if(forgot)forgot.addEventListener("click",async event=>{
    event.preventDefault();event.stopImmediatePropagation();
    const value=identifierInput.value.trim();
    if(!value.includes("@")){setError(identifierInput,"Para recuperar a palavra-passe, introduza o e-mail associado à conta.");identifierInput.focus();return;}
    try{const {error}=await client.auth.resetPasswordForEmail(value,{redirectTo:window.location.href.split("#")[0]});if(error)throw error;setMessage("Se o endereço estiver registado, receberá as instruções de recuperação.");}
    catch(error){setMessage(error.message||"Não foi possível enviar o pedido.",true);}
  },true);
  function closeByBack(){
    if(!overlay?.classList.contains("open"))return;
    overlay.classList.remove("open");overlay.setAttribute("aria-hidden","true");document.body.style.overflow="";
  }
  let historyEntry=false,changingHistory=false;
  if(overlay){
    const observer=new MutationObserver(()=>{
      const open=overlay.classList.contains("open");
      if(open&&!historyEntry&&!changingHistory){
        history.pushState({...(history.state||{}),authOverlay84:true},"","#auth");
        historyEntry=true;
      }else if(!open&&historyEntry&&history.state?.authOverlay84&&!changingHistory){
        changingHistory=true;history.back();setTimeout(()=>{historyEntry=false;changingHistory=false;},80);
      }
    });
    observer.observe(overlay,{attributes:true,attributeFilter:["class"]});
    window.addEventListener("popstate",()=>{
      if(historyEntry){historyEntry=false;closeByBack();}
    });
  }
  const closeButton=$("authClose");if(closeButton)closeButton.hidden=true;
  configureMode();
})();