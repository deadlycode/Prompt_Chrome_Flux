document.addEventListener('DOMContentLoaded', function() {
  const historyContainer = document.getElementById('historyContainer'); // Corrected ID
  const clearHistoryButton = document.getElementById('clearHistory');

  function renderHistory() {
    chrome.storage.sync.get(['promptHistory'], function(result) {
      const history = result.promptHistory || [];

      if (history.length === 0) {
        historyContainer.innerHTML = '<p class="no-history">Henüz kaydedilmiş bir prompt bulunmuyor.</p>';
        return;
      }
      
      historyContainer.innerHTML = ''; // Clear previous items
      
      // Newest items first
      history.slice().reverse().forEach(function(item, index) {
        const historyItemDiv = document.createElement('div');
        historyItemDiv.className = 'history-item';

        const date = new Date(item.timestamp);
        const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

        let profileInfoHtml = '';
        if (item.profileId) {
          profileInfoHtml = `<div class="profile-info">Profil ID: ${item.profileId}</div>`;
        }

        // Determine what to copy
        const textToCopy = item.generatedResponse || item.englishPrompt || '';

        historyItemDiv.innerHTML = `
          <p class="timestamp"><strong>Tarih:</strong> ${formattedDate}</p>
          ${item.model ? `<p><strong>Model:</strong> ${item.model}</p>` : ''}
          ${profileInfoHtml}
          <div class="turkish-text">
            <strong>Girdi Özeti:</strong>
            <p>${item.turkishText || 'N/A'}</p>
          </div>
          <div class="english-prompt">
            <strong>Gönderilen Prompt:</strong>
            <p>${item.englishPrompt || 'N/A'}</p>
          </div>
          <div class="generated-response">
            <strong>Yapay Zeka Yanıtı:</strong>
            <p>${item.generatedResponse || 'N/A'}</p>
          </div>
          <button class="copy-button" data-text-to-copy="${encodeURIComponent(textToCopy)}">Yanıtı Kopyala</button>
        `;

        historyContainer.appendChild(historyItemDiv);
      });
      
      // Add event listeners for copy buttons
      document.querySelectorAll('.copy-button').forEach(function(button) {
        button.addEventListener('click', function() {
          const text = decodeURIComponent(this.getAttribute('data-text-to-copy'));
          navigator.clipboard.writeText(text).then(function() {
            button.textContent = 'Kopyalandı!';
            setTimeout(function() {
              button.textContent = 'Yanıtı Kopyala';
            }, 2000);
          }).catch(err => {
            console.error('Kopyalama başarısız oldu: ', err);
            button.textContent = 'Hata!';
             setTimeout(function() {
              button.textContent = 'Yanıtı Kopyala';
            }, 2000);
          });
        });
      });
    });
  }

  clearHistoryButton.addEventListener('click', function() {
    if (confirm('Tüm geçmişi silmek istediğinizden emin misiniz?')) {
      chrome.storage.sync.set({ 'promptHistory': [] }, function() {
        renderHistory(); // Re-render to show empty state
        alert('Prompt geçmişi temizlendi.');
      });
    }
  });

  // Initial render
  renderHistory();
});
