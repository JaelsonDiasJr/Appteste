import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getDatabase, ref, set, get, child, onValue, onDisconnect } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

const firebaseConfig = { apiKey: "AIzaSyA2dxpfl9XwTjtX-DK4GBNihLMrQ8MVaDQ", authDomain: "meuquizapp-60807.firebaseapp.com", databaseURL: "https://meuquizapp-60807-default-rtdb.firebaseio.com", projectId: "meuquizapp-60807", storageBucket: "meuquizapp-60807.firebasestorage.app", messagingSenderId: "1036916991385", appId: "1:1036916991385:web:d1823e90a3c4fccb829f08" };
const db = getDatabase(initializeApp(firebaseConfig));

window.salaAtual = ""; window.jogadorAtual = "";

window.avancarParaNome = async function() {
  const pin = document.getElementById('roomCode').value;
  if (!pin) return ons.notification.alert('Insira o PIN!');
  const snap = await get(child(ref(db), `salas/${pin}`));
  if (snap.exists() && snap.val().status === 'aguardando') {
    window.salaAtual = pin; document.querySelector('#myNavigator').pushPage('name.html');
  } else { ons.notification.alert('Sala fechada ou não existe.'); }
};

window.entrarNoLobby = function() {
  const nome = document.getElementById('playerName').value;
  if (!nome) return; window.jogadorAtual = nome;
  
  const jogadorRef = ref(db, `salas/${window.salaAtual}/jogadores/${nome}`);
  set(jogadorRef, true).then(() => {
    
    // Se a pessoa fechar o app, remove ela do lobby automaticamente
    onDisconnect(jogadorRef).remove();
    
    document.querySelector('#myNavigator').pushPage('status.html');
    iniciarEscutaDaSala();

  }).catch(e => ons.notification.alert('Erro ao entrar.'));
};

window.enviarResposta = function(alternativa) {
  const respRef = ref(db, `salas/${window.salaAtual}/respostas/${window.jogadorAtual}`);
  set(respRef, { alternativa: alternativa, timestamp: Date.now() }).then(() => {
    document.getElementById('botoesJogo').classList.add('desativado');
    ons.notification.toast('Registrado! Aguarde...', { timeout: 2000 });
  });
};

function iniciarEscutaDaSala() {
  // 1. Escuta se fui expulso
  onValue(ref(db, `salas/${window.salaAtual}/jogadores/${window.jogadorAtual}`), (snap) => {
    if (!snap.exists()) {
      ons.notification.alert('Você foi removido da sala.');
      window.location.reload(); // Reinicia o app
    }
  });

  // 2. Escuta o status do jogo
  onValue(ref(db, `salas/${window.salaAtual}`), (snap) => {
    const sala = snap.val();
    if (!sala) return;
    
    const nav = document.querySelector('#myNavigator');
    const isGamePage = nav.topPage && nav.topPage.id === 'gamePage';
    
    if (sala.status === 'pergunta') {
      if(!isGamePage) nav.pushPage('game.html');
      else document.getElementById('botoesJogo').classList.remove('desativado'); // Libera os botões pra nova pergunta
    } 
    else {
      if(isGamePage) nav.popPage(); // Volta pra tela de status
      
      setTimeout(() => {
        const page = document.getElementById('statusPage');
        if(!page) return;
        const msg = page.querySelector('#msgStatus');
        const sub = page.querySelector('#subMsgStatus');
        const zonaPts = page.querySelector('#zonaPontos');
        const myPts = page.querySelector('#meusPontos');

        let pontuacaoUser = (sala.pontuacoes && sala.pontuacoes[window.jogadorAtual]) || 0;

        if (sala.status === 'ranking') {
          msg.innerText = "Tempo Esgotado!"; sub.innerText = "Olhe para o telão para ver sua posição.";
          zonaPts.style.display = 'none';
        } 
        else if (sala.status === 'fim_espera') {
          msg.innerText = "Fim de Jogo!"; sub.innerText = "Calculando resultados...";
        } 
        else if (sala.status === 'podio') {
          msg.innerText = "Resultados Liberados!"; sub.innerText = "Esta foi a sua pontuação total:";
          zonaPts.style.display = 'block'; myPts.innerText = pontuacaoUser + " pts";
        }
      }, 300); // pequeno delay pra garantir que a tela carregou
    }
  });
      window.abrirCamera = async function() {
    // Passo 1: Verifica se o clique do botão está funcionando
    alert("1. Botão foi clicado! Iniciando testes...");

    // Passo 2: Verifica se a ponte do Capacitor existe
    if (!window.Capacitor) {
      alert("ERRO: O objeto Capacitor não existe na página.");
      return;
    }

    // Passo 3: Verifica se o Capacitor sabe que está no celular
    if (!window.Capacitor.isNativePlatform()) {
      alert("ERRO: O sistema acha que estamos no navegador, não no app nativo.");
      return;
    }

    // Passo 4: Verifica se o plugin foi injetado corretamente
    const BarcodeScanner = window.Capacitor.Plugins.BarcodeScanner;
    if (!BarcodeScanner) {
      // Se falhar aqui, ele vai listar quais plugins estão instalados de verdade
      const pluginsInstalados = Object.keys(window.Capacitor.Plugins).join(", ");
      alert("ERRO: Plugin da Câmera não encontrado. Plugins disponíveis: " + pluginsInstalados);
      return;
    }

    try {
      alert("2. Pedindo permissão da câmera pro Android...");
      const status = await BarcodeScanner.checkPermission({ force: true });

      if (!status.granted) {
        alert("ERRO: Permissão negada.");
        return;
      }

      alert("3. Permissão OK! Escondendo a interface web...");
      document.body.classList.add('scanner-active');
      await BarcodeScanner.hideBackground();

      alert("4. Ligando o leitor de QR Code...");
      const result = await BarcodeScanner.startScan();

      if (result.hasContent) {
        alert("5. SUCESSO! Código lido: " + result.content);
        fecharCamera();
        document.getElementById('roomCode').value = result.content;
      }
    } catch (error) {
      // Se der qualquer erro nativo, o JSON.stringify vai transformar o erro em texto pra gente ler
      alert("ERRO NATIVO CATASTRÓFICO: " + JSON.stringify(error));
      fecharCamera();
    }
  };

  window.fecharCamera = async function() {
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      const { BarcodeScanner } = Capacitor.Plugins;
      // Para a câmera e mostra o fundo do app novamente
      await BarcodeScanner.showBackground();
      await BarcodeScanner.stopScan();
    }
    // Remove a classe que deixava tudo transparente
    document.body.classList.remove('scanner-active');
  };
}