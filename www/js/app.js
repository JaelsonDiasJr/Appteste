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

// Função unificada para enviar respostas (seja um ou vários itens)
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
      if(!isGamePage) {
        // Passamos a pergunta atual para a página para decidir como exibir os botões
        nav.pushPage('game.html', { data: { pergunta: sala.perguntas[sala.pergunta_atual] } });
      } else {
        const bc = document.getElementById('botoesJogo');
        if(bc) bc.classList.remove('desativado');
      }
    } else {
      if(isGamePage) nav.popPage();
      atualizarTelaStatus(sala);
    }
  });
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