document.addEventListener('DOMContentLoaded', function() {
  const modelSelect = document.getElementById('modelSelect');
  const modelInfo = document.getElementById('modelInfo');
  
  // Model açıklamaları
  const modelDescriptions = {
    'gemini-2.5-flash-preview-05-20': 'Gemini 2.5 Flash Preview: Adaptif düşünme ve maliyet verimliliği için optimize edilmiş en yeni model.',
    'gemini-2.5-pro-preview-05-06': 'Gemini 2.5 Pro Preview: Gelişmiş düşünme ve muhakeme, çok modlu anlama, gelişmiş kodlama için optimize edilmiş en güçlü model.',
    'gemini-2.0-flash': 'Gemini 2.0 Flash: Yeni nesil özellikler, hız ve gerçek zamanlı akış için optimize edilmiş kararlı model.',
    'gemini-1.5-pro': 'Gemini 1.5 Pro: Daha fazla zeka gerektiren karmaşık muhakeme görevleri için optimize edilmiş model.'
  };
  
  // Model seçimi değiştiğinde açıklamayı güncelle
  modelSelect.addEventListener('change', function() {
    modelInfo.textContent = modelDescriptions[modelSelect.value];
  });

  // Kayıtlı ayarları yükle
  chrome.storage.sync.get(['geminiApiKey', 'geminiModel'], function(result) {
    if (result.geminiApiKey) {
      document.getElementById('apiKey').value = result.geminiApiKey;
    }
    
    if (result.geminiModel) {
      modelSelect.value = result.geminiModel;
      modelInfo.textContent = modelDescriptions[result.geminiModel];
    }
  });

  // Kaydet butonuna tıklandığında
  document.getElementById('save').addEventListener('click', function() {
    const apiKey = document.getElementById('apiKey').value;
    const selectedModel = modelSelect.value;
    
    chrome.storage.sync.set({
      geminiApiKey: apiKey,
      geminiModel: selectedModel
    }, function() {
      const status = document.getElementById('status');
      status.textContent = 'Ayarlar kaydedildi!';
      status.className = 'status success';
      status.style.display = 'block';
      
      setTimeout(function() {
        status.style.display = 'none';
      }, 2000);
    });
  });
});
