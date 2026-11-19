(function(){
  "use strict";
  const PROJECT_URL="https://ruvtjfryrrbjtctgvwtc.supabase.co";
  const PUBLISHABLE_KEY="sb_publishable_44W6KLQQbzEAbIdI2YZASg_uoJzm2-C";
  const $=id=>document.getElementById(id);
  const form=$("authForm"),signup=$("signupFields"),email=$("authEmail"),password=$("authPassword");
  if(!form||!window.supabase)return;
  const client=window.supabase.createClient(PROJECT_URL,PUBLISHABLE_KEY,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  const countries=[
    ["Angola","+244"],["África do Sul","+27"],["Alemanha","+49"],["Argentina","+54"],["Austrália","+61"],["Áustria","+43"],["Bélgica","+32"],["Brasil","+55"],["Cabo Verde","+238"],["Canadá","+1"],["Chile","+56"],["China","+86"],["Colômbia","+57"],["Coreia do Sul","+82"],["Cuba","+53"],["Dinamarca","+45"],["Egito","+20"],["Espanha","+34"],["Estados Unidos","+1"],["Etiópia","+251"],["Filipinas","+63"],["Finlândia","+358"],["França","+33"],["Gana","+233"],["Guiné-Bissau","+245"],["Índia","+91"],["Indonésia","+62"],["Irlanda","+353"],["Israel","+972"],["Itália","+39"],["Japão","+81"],["Quénia","+254"],["Marrocos","+212"],["Moçambique","+258"],["Namíbia","+264"],["Nigéria","+234"],["Noruega","+47"],["Países Baixos","+31"],["Paquistão","+92"],["Peru","+51"],["Polónia","+48"],["Portugal","+351"],["Reino Unido","+44"],["República Democrática do Congo","+243"],["Rússia","+7"],["São Tomé e Príncipe","+239"],["Senegal","+221"],["Suécia","+46"],["Suíça","+41"],["Tanzânia","+255"],["Timor-Leste","+670"],["Turquia","+90"],["Ucrânia","+380"],["Zâmbia","+260"],["Zimbabwe","+263"]
  ];
  const labels=[...signup.querySelectorAll(".auth-field")];
  const findLabel=id=>$(id)?.closest(".auth-field");
  const full=findLabel("authFullName"),display=findLabel("authDisplayName"),country=findLabel("authCountry"),phone=findLabel("authPhone"),birth=findLabel("authBirthDate"),type=findLabel("authProfileType");
  if(display&&full)signup.insertBefore(display,full);
  if(country){
    const input=$("authCountry");input.setAttribute("list","authCountryOptions");input.placeholder="Pesquise e escolha o seu país";
    const datalist=document.createElement("datalist");datalist.id="authCountryOptions";
    countries.forEach(([name])=>{const option=document.createElement("option");option.value=name;datalist.appendChild(option);});
    country.appendChild(datalist);
  }
  let dialSelect=null;
  if(phone){
    const old=$("authPhone");old.type="tel";old.placeholder="Número de telefone";old.autocomplete="tel-national";
    const row=document.createElement("div");row.className="auth-phone-row";
    dialSelect=document.createElement("select");dialSelect.id="authDialCode";dialSelect.setAttribute("aria-label","Indicativo telefónico do país");
    countries.forEach(([name,dial])=>{const option=document.createElement("option");option.value=dial;option.textContent=dial+" · "+name;if(name==="Angola")option.selected=true;dialSelect.appendChild(option);});
    old.parentNode.insertBefore(row,old);row.append(dialSelect,old);
    const help=document.createElement("small");help.className="auth-field-hint";help.textContent="Escolha o indicativo correspondente ao seu país.";
    phone.appendChild(help);
  }
  if(country&&dialSelect){
    // Carrega a lista internacional completa; a lista incorporada continua disponível se a rede falhar.
    fetch("https://restcountries.com/v3.1/all?fields=name,idd")
      .then(response=>{if(!response.ok)throw new Error("countries");return response.json();})
      .then(rows=>{
        const all=(rows||[]).map(item=>{
          const name=item.name&&item.name.common;
          const root=item.idd&&item.idd.root;
          const suffixes=item.idd&&item.idd.suffixes;
          const dial=root?(root+((Array.isArray(suffixes)&&suffixes.length)?suffixes[0]:"")):"";
          return name&&dial? [name,dial]:null;
        }).filter(Boolean);
        const unique=[...new Map(all.map(item=>[item[0].toLocaleLowerCase("pt"),item])).values()]
          .sort((a,b)=>a[0].localeCompare(b[0],"pt"));
        if(!unique.length)return;
        const previousCountry=$("authCountry").value;
        const previousDial=dialSelect.value;
        countries.splice(0,countries.length,...unique);
        const list=$("authCountryOptions");list.replaceChildren();
        unique.forEach(([name])=>{const option=document.createElement("option");option.value=name;list.appendChild(option);});
        dialSelect.replaceChildren();
        unique.forEach(([name,dial])=>{const option=document.createElement("option");option.value=dial;option.textContent=dial+" · "+name;dialSelect.appendChild(option);});
        const selected=unique.find(([name])=>name.toLocaleLowerCase("pt")===previousCountry.toLocaleLowerCase("pt"));
        if(selected)dialSelect.value=selected[1];else if([...dialSelect.options].some(o=>o.value===previousDial))dialSelect.value=previousDial;
      })
      .catch(()=>{});
  }
    $("authCountry").addEventListener("input",()=>{
      const selected=countries.find(([name])=>name.toLocaleLowerCase("pt")=== $("authCountry").value.trim().toLocaleLowerCase("pt"));
      if(selected)dialSelect.value=selected[1];
    });
    $("authCountry").addEventListener("change",()=>{
      const selected=countries.find(([name])=>name.toLocaleLowerCase("pt")=== $("authCountry").value.trim().toLocaleLowerCase("pt"));
      if(selected)dialSelect.value=selected[1];
    });
  }
  if(phone&&birth)signup.insertBefore(phone,birth);
  if(birth&&type){
    const genderLabel=document.createElement("label");genderLabel.className="auth-field";genderLabel.textContent="Género";
    const gender=document.createElement("select");gender.id="authGender";gender.required=true;
    [["","Selecione o seu género"],["Feminino","Feminino"],["Masculino","Masculino"],["Outro","Outro"],["Prefiro não informar","Prefiro não informar"]].forEach(([value,text])=>{const o=document.createElement("option");o.value=value;o.textContent=text;gender.appendChild(o);});
    genderLabel.appendChild(gender);signup.insertBefore(genderLabel,birth);
  }
  if(type){type.querySelector("select").insertAdjacentHTML("beforeend",'<option value="artist">Artista</option><option value="promoter">Promotor</option><option value="sponsor">Patrocinador</option><option value="agent">Agente</option><option value="explorer">Explorador</option>');}
  if(full&&display)signup.insertBefore(full,display.nextSibling);
  const emailLabel=email.closest(".auth-field");
  const emailCaption=emailLabel?emailLabel.firstChild:null;
  const passwordLabel=password.closest(".auth-field");
  let confirmLabel=document.createElement("label");confirmLabel.className="auth-field";confirmLabel.id="authConfirmLabel";confirmLabel.textContent="Confirmar palavra-passe";
  const confirm=document.createElement("input");confirm.id="authPasswordConfirm";confirm.type="password";confirm.autocomplete="new-password";confirm.minLength=6;confirm.required=true;confirm.placeholder="Digite novamente a palavra-passe";
  confirmLabel.appendChild(confirm);
  const confirmError=document.createElement("p");confirmError.className="auth-confirm-error";confirmError.id="authConfirmError";confirmError.setAttribute("aria-live","polite");confirmLabel.appendChild(confirmError);
  passwordLabel.after(confirmLabel);
  confirmLabel.hidden=true;
  const togglePassword=(input,label)=>{
    const wrap=document.createElement("div");wrap.className="auth-password-wrap";
    input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);
    const button=document.createElement("button");button.type="button";button.className="auth-password-toggle";button.textContent="Mostrar";button.setAttribute("aria-label","Mostrar palavra-passe");
    button.addEventListener("click",()=>{const show=input.type==="password";input.type=show?"text":"password";button.textContent=show?"Ocultar":"Mostrar";button.setAttribute("aria-label",show?"Ocultar palavra-passe":"Mostrar palavra-passe");});
    wrap.appendChild(button);
  };
  togglePassword(password);togglePassword(confirm);
  function modeNow(){return document.querySelector('[data-auth-mode].active')?.dataset.authMode||"login";}
  function configureMode(){
    const isSignup=modeNow()==="signup";
    email.type=isSignup?"email":"text";
    email.autocomplete=isSignup?"email":"username";
    email.placeholder=isSignup?"exemplo@email.com":"Nome de utilizador ou e-mail";
    if(emailCaption&&emailCaption.nodeType===Node.TEXT_NODE)emailCaption.textContent=isSignup?"E-mail":"Nome de utilizador ou e-mail";
    password.autocomplete=isSignup?"new-password":"current-password";
    confirmLabel.hidden=!isSignup;
    confirm.required=isSignup;
    if(emailLabel)emailLabel.hidden=false;
    if(passwordLabel)passwordLabel.hidden=false;
    const submit=$("authSubmit");if(submit)submit.textContent=isSignup?"Criar a minha conta":"Iniciar sessão";
    const message=$("authMessage");if(message)message.textContent="";
    confirmError.textContent="";
  }
  document.addEventListener("click",event=>{
    const tab=event.target.closest("[data-auth-mode]");
    if(tab)configureMode();
  },true);
  const originalCountry= $("authCountry");
  const originalPhone=$("authPhone");
  function setMessage(text,error){
    const node=$("authMessage");if(node){node.textContent=text||"";node.classList.toggle("error",!!error);}
  }
  function validBirthDate(value){
    if(!value)return false;
    const date=new Date(value+"T00:00:00");
    const now=new Date();if(Number.isNaN(date.getTime())||date>now)return false;
    let age=now.getFullYear()-date.getFullYear();
    const month=now.getMonth()-date.getMonth();
    if(month<0||(month===0&&now.getDate()<date.getDate()))age--;
    return age>=13;
  }
  form.addEventListener("submit",async event=>{
    event.preventDefault();event.stopImmediatePropagation();
    const isSignup=modeNow()==="signup",identifier=email.value.trim(),pass=password.value;
    const submit=$("authSubmit");
    if(isSignup){
      const fullName=$("authFullName").value.trim(),displayName=$("authDisplayName").value.trim();
      const countryName=originalCountry.value.trim(),phoneNumber=originalPhone.value.trim();
      const gender=$("authGender").value,birthDate=$("authBirthDate").value;
      const confirmValue=confirm.value;
      if(!displayName||!fullName||!countryName||!phoneNumber||!gender||!birthDate||!identifier||!pass||!confirmValue){setMessage("Preencha todos os campos obrigatórios.",true);return;}
      if(!countries.some(([name])=>name.toLocaleLowerCase("pt")===countryName.toLocaleLowerCase("pt"))){setMessage("Escolha um país válido na lista de pesquisa.",true);return;}
      if(!/^\d[\d\s()\-]{5,}$/.test(phoneNumber)){setMessage("Introduza um número de telefone válido, sem repetir o indicativo.",true);return;}
      if(!validBirthDate(birthDate)){setMessage("A data de nascimento deve ser válida e corresponder a uma idade mínima de 13 anos.",true);return;}
      if(pass.length<8){setMessage("A palavra-passe deve ter pelo menos 8 caracteres.",true);return;}
      if(pass!==confirmValue){confirmError.textContent="As palavras-passe não coincidem.";setMessage("A confirmação da palavra-passe está diferente.",true);confirm.focus();return;}
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)){setMessage("Introduza um endereço de e-mail válido.",true);return;}
      if(submit){submit.disabled=true;submit.textContent="A criar conta...";}
      try{
        const metadata={full_name:fullName,display_name:displayName,username:displayName.toLowerCase(),country:countryName,phone:dialSelect.value+" "+phoneNumber,gender,birth_date:birthDate,profile_type:$("authProfileType").value};
        const {data,error}=await client.auth.signUp({email:identifier,password:pass,options:{data:metadata,emailRedirectTo:window.location.href.split("#")[0]}});
        if(error)throw error;
        if(data.session){
          setMessage("Conta criada. A preparar a sua área pessoal...");
          await client.auth.setSession({access_token:data.session.access_token,refresh_token:data.session.refresh_token});
          window.location.reload();
        }else{
          setMessage("Conta criada! Confirme o endereço através do link enviado para o seu e-mail. Depois da confirmação, poderá entrar na sua conta.");
        }
      }catch(error){setMessage(error.message||"Não foi possível criar a conta. Tente novamente.",true);}
      finally{if(submit){submit.disabled=false;submit.textContent="Criar a minha conta";}}
      return;
    }
    if(!identifier||!pass){setMessage("Introduza o seu nome de utilizador ou e-mail e a palavra-passe.",true);return;}
    if(submit){submit.disabled=true;submit.textContent="A verificar...";}
    try{
      const {data,error}=await client.functions.invoke("login-with-username",{body:{identifier,password:pass}});
      if(error)throw error;
      if(!data?.access_token||!data?.refresh_token)throw new Error(data?.error||"Não foi possível iniciar sessão.");
      const {error:sessionError}=await client.auth.setSession({access_token:data.access_token,refresh_token:data.refresh_token});
      if(sessionError)throw sessionError;
      setMessage("Sessão iniciada. A abrir a sua área pessoal...");
      window.location.reload();
    }catch(error){setMessage(error.message||"Dados de acesso inválidos. Verifique e tente novamente.",true);}
    finally{if(submit){submit.disabled=false;submit.textContent="Iniciar sessão";}}
  },true);
  const forgot=$("forgotPassword");
  if(forgot)forgot.addEventListener("click",async event=>{
    event.preventDefault();event.stopImmediatePropagation();
    const value=email.value.trim();
    if(!value.includes("@")){setMessage("Para recuperar a palavra-passe, introduza o endereço de e-mail associado à conta.",true);email.focus();return;}
    try{const {error}=await client.auth.resetPasswordForEmail(value,{redirectTo:window.location.href.split("#")[0]});if(error)throw error;setMessage("Se o endereço estiver registado, receberá as instruções de recuperação.");}
    catch(error){setMessage(error.message||"Não foi possível enviar o pedido.",true);}
  },true);
  configureMode();
  const overlay=$("authOverlay");
  if(overlay){const observer=new MutationObserver(()=>{if(overlay.classList.contains("open"))configureMode();});observer.observe(overlay,{attributes:true,attributeFilter:["class"]});}
})();