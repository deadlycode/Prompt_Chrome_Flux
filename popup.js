document.addEventListener('DOMContentLoaded', function() {
  // const input = document.getElementById('input'); // Artık doğrudan kullanılmıyor
  const generateButton = document.getElementById('generate');
  const result = document.getElementById('result');
  const error = document.getElementById('error');

  const profileSelectDropdown = document.getElementById('profileSelectDropdown');
  const dynamicInputsContainer = document.getElementById('dynamicInputsContainer');
  const promptPreviewArea = document.getElementById('promptPreviewArea');

  let availableProfiles = []; // Yüklenen profilleri saklamak için
  let currentSelectedProfile = null; // Seçili profili saklamak için

  const historyButton = document.createElement('button');
  historyButton.textContent = 'Geçmişi Görüntüle';
  historyButton.className = 'history-button-style'; // Apply common style
  // historyButton.style.marginTop = '10px'; // Stil CSS'den gelecek
  // historyButton.style.width = '100%';
  // historyButton.style.backgroundColor = '#3498db'; // Stil CSS'den gelecek
  // historyButton.style.color = 'white';
  // historyButton.style.border = 'none';
  // historyButton.style.padding = '10px';
  // historyButton.style.borderRadius = '4px';
  // historyButton.style.cursor = 'pointer';
  
  historyButton.addEventListener('click', function() {
    chrome.tabs.create({ url: 'history.html' });
  });

  // Insert history button before the script tag, or at a specific point if layout is critical
  // document.body.appendChild(historyButton);
  // For better control, let's insert it after the result div
  result.parentNode.insertBefore(historyButton, result.nextSibling);


  function loadProfiles() {
    chrome.storage.sync.get(['promptProfiles'], function(result) {
      availableProfiles = result.promptProfiles || [];
      profileSelectDropdown.innerHTML = '<option value="" disabled selected>-- Bir Profil Seçin --</option>'; // Reset options
      availableProfiles.forEach(profile => {
        const option = document.createElement('option');
        option.value = profile.id;
        option.textContent = profile.name; // Should be HTML escaped if names can contain special chars, but for now it's fine
        profileSelectDropdown.appendChild(option);
      });

      // Restore last selected profile
      chrome.storage.local.get(['lastSelectedProfileId'], function(localResult) {
        if (localResult.lastSelectedProfileId) {
          const lastId = localResult.lastSelectedProfileId;
          if (availableProfiles.some(p => p.id === lastId)) {
            profileSelectDropdown.value = lastId;
          }
        }
        // Trigger handleProfileSelection even if no profile was restored, to set initial state
        handleProfileSelection();
      });
    });
  }

  function handleProfileSelection() {
    hideError(); // Hide any previous errors
    const selectedProfileId = profileSelectDropdown.value;
    dynamicInputsContainer.innerHTML = ''; // Clear previous inputs
    promptPreviewArea.textContent = ''; // Clear preview

    if (!selectedProfileId) {
      currentSelectedProfile = null;
      // chrome.storage.local.remove('lastSelectedProfileId'); // No need to remove, just don't set
      updatePromptPreview(); // Update preview to be empty
      return;
    }

    chrome.storage.local.set({ 'lastSelectedProfileId': selectedProfileId });
    currentSelectedProfile = availableProfiles.find(p => p.id === selectedProfileId);

    if (currentSelectedProfile && currentSelectedProfile.template) {
      const variableRegex = /\{([^}]+)\}/g;
      let match;
      const uniqueVariables = new Set();
      while ((match = variableRegex.exec(currentSelectedProfile.template)) !== null) {
        uniqueVariables.add(match[1]);
      }

      if (uniqueVariables.size > 0) {
        uniqueVariables.forEach(varName => {
          const varContainer = document.createElement('div');
          varContainer.className = 'dynamic-input-group'; // For styling

          const label = document.createElement('label');
          // Sanitize varName for display and for use in id (though dataset.variableName is safer for retrieval)
          const cleanVarName = varName.replace(/[^a-zA-Z0-9_]/g, '');
          label.textContent = `${varName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:`;
          label.htmlFor = `dyn_var_${cleanVarName}`;

          const input = document.createElement('input');
          input.type = 'text';
          input.id = `dyn_var_${cleanVarName}`;
          input.dataset.variableName = varName; // Store original varName here
          input.placeholder = `${varName.replace(/_/g, ' ')} değerini girin...`;

          input.addEventListener('input', updatePromptPreview);

          varContainer.appendChild(label);
          varContainer.appendChild(input);
          dynamicInputsContainer.appendChild(varContainer);
        });
      } else {
         dynamicInputsContainer.innerHTML = '<p style="font-size:0.9em; color:#555; text-align:center;">Bu profil için dinamik değişken bulunmuyor.</p>';
      }
      updatePromptPreview(); // Initial preview update
    }
  }

  function updatePromptPreview() {
    if (!currentSelectedProfile || !currentSelectedProfile.template) {
      promptPreviewArea.textContent = currentSelectedProfile ? 'Bu profil için şablon bulunamadı.' : 'Lütfen bir profil seçin.';
      return;
    }

    let promptText = currentSelectedProfile.template;
    const inputs = dynamicInputsContainer.querySelectorAll('input[data-variable-name]');

    inputs.forEach(input => {
      const varName = input.dataset.variableName; // Use original varName from dataset
      // Ensure regex is properly escaped if varName can contain special regex characters
      // For simple {var_name} it's usually fine.
      const regex = new RegExp(`\\{${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`, 'g');
      promptText = promptText.replace(regex, input.value || `{${varName}}`);
    });
    promptPreviewArea.textContent = promptText;
  }

  generateButton.addEventListener('click', async function() {
    hideError(); // Clear previous errors

    if (!profileSelectDropdown.value || !currentSelectedProfile) {
      showError('Lütfen bir profil seçin.');
      return;
    }

    const generatedPrompt = promptPreviewArea.textContent;

    // Check for unfilled placeholders more robustly
    if (generatedPrompt.match(/\{([^}]+)\}/g)) {
        showError('Lütfen tüm değişken alanlarını doldurun. Önizlemede {alan_adı} şeklinde yer tutucular kalmamalıdır.');
        return;
    }
    if (!generatedPrompt.trim()) {
        showError('Oluşturulan prompt boş olamaz.');
        return;
    }

    const { geminiApiKey, geminiModel } = await chrome.storage.sync.get(['geminiApiKey', 'geminiModel']);
    if (!geminiApiKey) {
      showError('Gemini API Anahtarı ayarlanmamış. Lütfen Seçenekler sayfasından ayarlayın.');
      return;
    }
    const modelToUse = geminiModel || 'gemini-2.5-flash-preview-05-20'; // Default model

    generateButton.disabled = true;
    generateButton.textContent = 'Oluşturuluyor...';
    result.style.display = 'none';
    // error.style.display = 'none'; // showError zaten bunu yapar

    try {
      const apiRequestBody = {
        contents: [{ parts: [{ text: generatedPrompt }] }],
        generationConfig: {
          temperature: 1.0, topK: 40, topP: 1, maxOutputTokens: 2048
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      };

      const response = await chrome.runtime.sendMessage({
        action: "makeApiRequest",
        url: `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${geminiApiKey}`,
        body: apiRequestBody
      });

      if (!response.success) {
        throw new Error(response.error || 'API yanıtında bilinmeyen bir hata oluştu.');
      }
      const data = response.data;
      if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        console.error("Unexpected API response structure:", data);
        throw new Error('API yanıtı geçerli bir formatta değil veya içerik boş.');
      }

      const finalGeneratedText = data.candidates[0].content.parts[0].text;
      result.textContent = finalGeneratedText;
      result.style.display = 'block';

      // History logging
      chrome.storage.sync.get(['promptHistory'], function(syncResult) {
        const history = syncResult.promptHistory || [];
        if (history.length >= 20) {
          history.shift();
        }
        
        let variableInputs = "";
        const dynamicInputs = dynamicInputsContainer.querySelectorAll('input[data-variable-name]');
        if (dynamicInputs.length > 0) {
            dynamicInputs.forEach(input => {
                variableInputs += `${input.dataset.variableName}: ${input.value || 'Boş'}, `;
            });
            variableInputs = variableInputs.slice(0, -2);
        } else {
            variableInputs = "Değişken yok";
        }


        history.push({
          turkishText: `${currentSelectedProfile.name} (${variableInputs})`,
          englishPrompt: generatedPrompt,
          generatedResponse: finalGeneratedText,
          timestamp: new Date().toISOString(),
          model: modelToUse,
          profileId: currentSelectedProfile.id
        });
        chrome.storage.sync.set({ 'promptHistory': history });
      });

    } catch (err) {
      console.error("Prompt generation error:", err);
      showError('Hata: ' + err.message);
    } finally {
      generateButton.disabled = false;
      generateButton.textContent = 'Prompt Oluştur';
    }
  });

  function showError(message) {
    error.textContent = message;
    error.style.display = 'block';
    result.style.display = 'none'; // Sonucu gizle
  }

  function hideError() {
    error.style.display = 'none';
  }

  // Initialization
  loadProfiles();
  profileSelectDropdown.addEventListener('change', handleProfileSelection);
});
