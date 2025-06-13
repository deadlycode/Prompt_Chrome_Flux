document.addEventListener('DOMContentLoaded', function() {
  const historyList = document.getElementById('historyList');
  
  chrome.storage.sync.get(['promptHistory'], function(result) {
    const history = result.promptHistory || [];
    
    if (history.length === 0) {
      historyList.innerHTML = '<p>Henüz kaydedilmiş prompt bulunmuyor.</p>';
      return;
    }
    
    historyList.innerHTML = '';
    
    history.forEach(function(item, index) {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      
      const date = new Date(item.timestamp);
      const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
      
      historyItem.innerHTML = `
        <div class="history-header">
          <span class="history-date">${formattedDate}</span>
          ${item.model ? `<span class="history-model">Model: ${item.model}</span>` : ''}
        </div>
        <div class="history-content">
          <div class="history-turkish">
            <strong>Türkçe:</strong>
            <p>${item.turkishText}</p>
          </div>
          <div class="history-english">
            <strong>İngilizce Prompt:</strong>
            <p>${item.englishPrompt}</p>
            <button class="copy-button" data-prompt="${encodeURIComponent(item.englishPrompt)}">Kopyala</button>
          </div>
        </div>
      `;
      
      historyList.appendChild(historyItem);
    });
    
    // Kopyalama butonları için event listener ekle
    document.querySelectorAll('.copy-button').forEach(function(button) {
      button.addEventListener('click', function() {
        const prompt = decodeURIComponent(this.getAttribute('data-prompt'));
        navigator.clipboard.writeText(prompt).then(function() {
          button.textContent = 'Kopyalandı!';
          setTimeout(function() {
            button.textContent = 'Kopyala';
          }, 2000);
        });
      });
    });
  });
});
