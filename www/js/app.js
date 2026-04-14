import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getDatabase, ref, set, get, child, onValue, onDisconnect } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

const firebaseConfig = { 
  apiKey: "AIzaSyA2dxpfl9XwTjtX-DK4GBNihLMrQ8MVaDQ", 
  authDomain: "meuquizapp-60807.firebaseapp.com", 
  databaseURL: "https://meuquizapp-60807-default-rtdb.firebaseio.com", 
  projectId: "meuquizapp-60807", 
  storageBucket: "meuquizapp-60807.firebasestorage.app", 
  messagingSenderId: "1036916991385", 
  appId: "1:1036916991385:web:d1823e90a3c4fccb829f08" 
};
const db = getDatabase(initializeApp(firebaseConfig));

window.salaAtual = ""; 
window.jogadorAtual = "";

// Variáveis para controlar o estado da pergunta atual no lado do cliente
let selecoesAtuais = [];
let tipoPerguntaAtual = "";

window.avancarParaNome = async function() {
  const pin = document.getElementById('roomCode').value;
  if (!pin) return ons.notification.alert('PIN vazio!');
  const snap = await get(child(ref(db), `salas/${pin}`));
  if (snap.exists() && snap.val().status === 'aguardando') {
    window.salaAtual = pin; document.querySelector('#myNavigator').pushPage('name.html');
  } else { ons.notification.alert('Sala inválida.'); }
};

window.entrarNoLobby = function() {
  const nome = document.getElementById('playerName').value;
  if (!nome) return; 
  window.jogadorAtual = nome;
  const jogadorRef = ref(db, `salas/${window.salaAtual}/jogadores/${nome}`);
  set(jogadorRef, true).then(() => {
    onDisconnect(jogadorRef).remove();
    document.querySelector('#myNavigator').pushPage('status.html');
    iniciarEscutaDaSala();
  });
};

// Gerencia o clique nos botões de alternativa
window.selecionarOpcao = function(index, elemento) {
  if (tipoPerguntaAtual === 'unica') {
    // Para única escolha, envia direto e destaca a borda
    elemento.style.border = "5px solid white";
    window.enviarResposta([index]);
  } else {
    // Para múltipla escolha, adiciona/remove do array de controle
    if (selecoesAtuais.includes(index)) {
      selecoesAtuais = selecoesAtuais.filter(i => i !== index);
      elemento.style.border = "3px solid #000"; // Remove destaque
    } else {
      selecoesAtuais.push(index);
      elemento.style.border = "5px solid white"; // Adiciona destaque
    }
  }
};

// Disparado pelo botão de confirmar (apenas para múltipla escolha)
window.confirmarMultipla = function() {
  if (selecoesAtuais.length === 0) return ons.notification.alert('Selecione ao menos uma opção!');
  window.enviarResposta(selecoesAtuais);
};

window.enviarResposta = function(escolhas) {
  const arrayRespostas = Array.isArray(escolhas) ? escolhas : [escolhas];
  const respRef = ref(db, `salas/${window.salaAtual}/respostas/${window.jogadorAtual}`);
  
  set(respRef, { alternativas: arrayRespostas, timestamp: Date.now() }).then(() => {
    const btnContainer = document.getElementById('botoesJogo');
    if(btnContainer) btnContainer.classList.add('desativado');
    ons.notification.toast('Resposta enviada!');
  });
};

function iniciarEscutaDaSala() {
  onValue(ref(db, `salas/${window.salaAtual}`), (snap) => {
    const sala = snap.val();
    if (!sala) return;
    
    const nav = document.querySelector('#myNavigator');
    const isGamePage = nav.topPage && nav.topPage.id === 'gamePage';
    
    if (sala.status === 'pergunta') {
      const perguntaData = sala.perguntas[sala.pergunta_atual];
      tipoPerguntaAtual = perguntaData.tipo;
      selecoesAtuais = []; // Reseta o estado local de seleções
      
      if(!isGamePage) {
        // Empurra a tela e configura a interface assim que o DOM for montado
        nav.pushPage('game.html').then(() => {
            configurarTelaJogo(perguntaData);
        });
      } else {
        const bc = document.getElementById('botoesJogo');
        if(bc) bc.classList.remove('desativado');
        configurarTelaJogo(perguntaData);
      }
    } else {
      if(isGamePage) nav.popPage();
      atualizarTelaStatus(sala);
    }
  });
}

function configurarTelaJogo(pergunta) {
  const btnConfirmar = document.getElementById('btnConfirmar');
  const instrucao = document.getElementById('tipoInstrucao');
  
  // Reseta visualmente as bordas dos botões a cada nova pergunta
  document.querySelectorAll('.btn-opcao').forEach(btn => {
    btn.style.border = "3px solid #000";
  });

  if (pergunta.tipo === 'multipla') {
    if(btnConfirmar) btnConfirmar.style.display = 'block';
    if(instrucao) instrucao.innerText = "Múltipla Escolha - Selecione as corretas";
  } else {
    if(btnConfirmar) btnConfirmar.style.display = 'none';
    if(instrucao) instrucao.innerText = "Escolha uma única opção";
  }
}

function atualizarTelaStatus(sala) {
  setTimeout(() => {
    const page = document.getElementById('statusPage');
    if(!page) return;
    const msg = page.querySelector('#msgStatus');
    const sub = page.querySelector('#subMsgStatus');
    const ptsDiv = page.querySelector('#zonaPontos');
    const myPts = page.querySelector('#meusPontos');
    const total = (sala.pontuacoes && sala.pontuacoes[window.jogadorAtual]) || 0;

    if (sala.status === 'ranking') {
      msg.innerText = "Tempo Esgotado!";
      sub.innerText = "Veja sua posição no telão.";
      ptsDiv.style.display = 'none';
    } else if (sala.status === 'podio') {
      msg.innerText = "Fim da Partida!";
      sub.innerText = "Sua pontuação final:";
      ptsDiv.style.display = 'block';
      myPts.innerText = total + " pts";
    }
  }, 200);
}