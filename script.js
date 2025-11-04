document.addEventListener("DOMContentLoaded", function () {
    'use strict';

    const allAudioPlayers = [];
  
  
  
  
  
  // ===================================================================
  // Reusable Audio Player Logic
  // ===================================================================
  function initAllAudioPlayers() {
      // FIX: Prevents icons from blocking clicks on the parent button
      const allIcons = document.querySelectorAll('.tts-media_icon');
      allIcons.forEach(icon => {
          icon.style.pointerEvents = 'none';
      });
  
      const AUDIO_CDN_BASE = 'https://cdn.jsdelivr.net/gh/adarshgowdaa/website-audio@2f9dde10df0a7c4a4d45bea9456feb1b45132d10/';
  
      function createSwitchablePlayer(config) {
          const { controlRadiosQuery, toggleId, playPauseBtnId, playIconId, pauseIconId, sliderId, otherLangLabelId, fileMap, resolveUrlFn } = config;
          const playPauseBtn = document.getElementById(playPauseBtnId);
          if (!playPauseBtn) return;
          
          const controlRadios = document.querySelectorAll(controlRadiosQuery);
          const toggle = document.getElementById(toggleId);
          const playIcon = document.getElementById(playIconId);
          const pauseIcon = document.getElementById(pauseIconId);
          const slider = document.getElementById(sliderId);
          const otherLangLabel = document.getElementById(otherLangLabelId);
      
          const audioEl = new Audio();
          audioEl.preload = 'auto';
          allAudioPlayers.push(audioEl);
          let isSwitching = false;
          
          const updateIcons = (isPlaying) => {
              if (playIcon) playIcon.style.display = isPlaying ? 'none' : 'flex';
              if (pauseIcon) pauseIcon.style.display = isPlaying ? 'flex' : 'none';
          };
          const updateToggleLabel = () => {
            if (!otherLangLabel) return;
            const selectedRadio = document.querySelector(`${controlRadiosQuery}:checked`);
            if (selectedRadio) {
                const labelSpan = selectedRadio.parentElement.querySelector('.technology_form-select-link-label');
                if (labelSpan) otherLangLabel.textContent = labelSpan.textContent;
            }
          };
          const resolveAudioUrl = () => AUDIO_CDN_BASE + resolveUrlFn(fileMap);
          
          async function switchSource(newUrl) {
              if (isSwitching || audioEl.src.endsWith(newUrl)) return;
              
              isSwitching = true;
              const wasPlaying = !audioEl.paused && !audioEl.ended;
              const oldTime = audioEl.currentTime || 0;
      
              try {
                  audioEl.pause();
                  audioEl.src = newUrl;
                  await new Promise((resolve, reject) => {
                      audioEl.addEventListener('loadedmetadata', resolve, { once: true });
                      audioEl.addEventListener('error', reject, { once: true });
                  });
                  
                  const duration = isFinite(audioEl.duration) ? audioEl.duration : 0;
                  audioEl.currentTime = Math.min(oldTime, duration);
      
                  if (wasPlaying) {
                      await audioEl.play();
                  }
              } catch (err) {
                  console.warn(`Seamless switch failed for ${playPauseBtnId}:`, err);
              } finally {
                  updateIcons(!audioEl.paused);
                  isSwitching = false;
              }
          }
          
          playPauseBtn.addEventListener('click', async () => {
            const desiredUrl = resolveAudioUrl();
            if (!audioEl.src.endsWith(desiredUrl)) {
                await switchSource(desiredUrl);
                if (audioEl.paused) {
                  await audioEl.play().catch(e=>console.error(e));
                }
            } else {
                audioEl.paused ? await audioEl.play().catch(e=>console.error(e)) : audioEl.pause();
            }
          });
          
          const onControlChange = () => {
              if (otherLangLabelId) updateToggleLabel();
              switchSource(resolveAudioUrl());
          };
          
          controlRadios.forEach(r => r.addEventListener('change', onControlChange));
          if (toggle) toggle.addEventListener('change', onControlChange);
          
          audioEl.addEventListener('timeupdate', () => slider && isFinite(audioEl.duration) && (slider.value = (audioEl.currentTime / audioEl.duration) * 100));
          if (slider) slider.addEventListener('input', () => isFinite(audioEl.duration) && (audioEl.currentTime = (slider.value / 100) * audioEl.duration));
          
          audioEl.onplay = () => {
              allAudioPlayers.forEach(p => p !== audioEl && !p.paused && p.pause());
              updateIcons(true);
          };
          audioEl.onpause = () => updateIcons(false);
          audioEl.onended = () => { updateIcons(false); if (slider) slider.value = 0; };
          
          if(otherLangLabelId) updateToggleLabel();
          updateIcons(false);
          audioEl.src = resolveAudioUrl();
      }
      
      function createSimplePlayer(config) {
        const { playPauseBtnId, playIconId, pauseIconId, sliderId, audioUrl } = config;
        const playPauseBtn = document.getElementById(playPauseBtnId);
        if (!playPauseBtn) return null;
  
        const playIcon = document.getElementById(playIconId);
        const pauseIcon = document.getElementById(pauseIconId);
        const slider = document.getElementById(sliderId);
        const audioEl = new Audio(audioUrl);
        audioEl.preload = 'auto';
        allAudioPlayers.push(audioEl);
        
        const updateIcons = (isPlaying) => {
            if (playIcon) playIcon.style.display = isPlaying ? 'none' : 'flex';
            if (pauseIcon) pauseIcon.style.display = isPlaying ? 'flex' : 'none';
        };
  
        playPauseBtn.addEventListener('click', () => audioEl.paused ? audioEl.play() : audioEl.pause());
        
        audioEl.onplay = () => {
            allAudioPlayers.forEach(p => p !== audioEl && !p.paused && p.pause());
            updateIcons(true);
        };
        audioEl.onpause = () => updateIcons(false);
        audioEl.onended = () => { updateIcons(false); if (slider) slider.value = 0; };
        
        audioEl.addEventListener('timeupdate', () => slider && isFinite(audioEl.duration) && (slider.value = (audioEl.currentTime / audioEl.duration) * 100));
        if (slider) slider.addEventListener('input', () => isFinite(audioEl.duration) && (audioEl.currentTime = (slider.value / 100) * audioEl.duration));
        
        updateIcons(false);
        if (slider) slider.value = 0;
        return audioEl;
      }
      
      // --- STS Player Config ---
      const stsFilesBySpeaker = {
          Blondie: { English: 'English_Blondie.mp3', German: 'German_Blondie.mp3', Spanish: 'Spanish_Blondie.mp3' },
          Matt: { English: 'English_Matt.mp3', French: 'French_Matt.mp3' },
          Raju: { English: 'English_Raju.mp3', Kannada: 'Kannada_Raju.mp3', Malayalam: 'Malayalam_Raju.mp3', Marathi: 'Marathi_Raju.mp3' },
          Shakuntala: { English: 'English_Shakuntala.mp3', Hindi: 'Hindi_Shakuntala.mp3', Bengali: 'Bengali_Shakuntala.mp3', Tamil: 'Tamil_shakuntala.mp3' },
      };
      createSwitchablePlayer({
          controlRadiosQuery: 'input[name="STS-Language"]', toggleId: 'sts-check', playPauseBtnId: 'sts-play-pause', playIconId: 'sts-play-icon',
          pauseIconId: 'sts-pause-icon', sliderId: 'sts-slider', otherLangLabelId: 'sts-other-lang', fileMap: stsFilesBySpeaker,
          resolveUrlFn: (fileMap) => {
              const langRaw = document.querySelector('input[name="STS-Language"]:checked')?.value || 'French';
              const speakerMap = { German: 'Blondie', Spanish: 'Blondie', French: 'Matt', Kannada: 'Raju', Malayalam: 'Raju', Marathi: 'Raju', Hindi: 'Shakuntala', Bengali: 'Shakuntala', Tamil: 'Shakuntala' };
              const speaker = speakerMap[langRaw] || 'Blondie';
              const files = fileMap[speaker] || {};
              const isToggled = document.getElementById('sts-check')?.checked;
              return isToggled ? (files[langRaw] || files.English) : files.English;
          }
      });
  
      // --- Noise Cancellation Player Config ---
      const noiseFiles = {
          'Office': { original: 'Office.mp3', neutralized: 'Office_Neutralized.mp3' },
          'Call Centre': { original: 'Call_Center.mp3', neutralized: 'Call_Center_Neutralized.mp3' },
          'Traffic': { original: 'Traffic.mp3', neutralized: 'Traffic_Neutralized.mp3' }
      };
      createSwitchablePlayer({
          controlRadiosQuery: 'input[name="Noise-Environment"]', toggleId: 'noise-check', playPauseBtnId: 'noise-play-pause', playIconId: 'noise-play-icon',
          pauseIconId: 'noise-pause-icon', sliderId: 'noise-slider', fileMap: noiseFiles,
          resolveUrlFn: (fileMap) => {
              const environment = document.querySelector('input[name="Noise-Environment"]:checked')?.value || 'Office';
              const isNeutralized = document.getElementById('noise-check')?.checked;
              const fileSet = fileMap[environment] || fileMap['Office'];
              return isNeutralized ? fileSet.neutralized : fileSet.original;
          }
      });
  
      // --- Barge-in Players Config ---
      createSimplePlayer({ playPauseBtnId: 'barge-play-pause', playIconId: 'barge-play-icon', pauseIconId: 'barge-pause-icon', sliderId: 'barge-slider', audioUrl: AUDIO_CDN_BASE + 'With _barge.mp3' });
      createSimplePlayer({ playPauseBtnId: 'nobarge-play-pause', playIconId: 'nobarge-play-icon', pauseIconId: 'nobarge-pause-icon', sliderId: 'nobarge-slider', audioUrl: AUDIO_CDN_BASE + 'Without_barge.mp3' });
  }
  
// ===================================================================
// DEDICATED ACCENT PLAYER LOGIC (FINAL VERSION)
// ===================================================================
function initAccentPlayerLogic() {
    const playPauseBtn = document.getElementById('accent-play-pause');
    const playIcon = document.getElementById('accent-play-icon');
    const pauseIcon = document.getElementById('accent-pause-icon');
    const slider = document.getElementById('accent-slider');
    const toggle = document.getElementById('accent-check');
    const controlRadios = document.querySelectorAll('input[name="Accent-Transformation"]');

    if (playIcon) playIcon.style.pointerEvents = 'none';
    if (pauseIcon) pauseIcon.style.pointerEvents = 'none';

    if (!playPauseBtn) {
      return;
    }

    const audioEl = new Audio();
    audioEl.preload = 'auto';

    // ▼▼▼ CHANGE #1: Add this player to the shared list ▼▼▼
    allAudioPlayers.push(audioEl);

    const AUDIO_CDN_BASE = 'https://cdn.jsdelivr.net/gh/adarshgowdaa/website-audio@2f9dde10df0a7c4a4d45bea9456feb1b45132d10/';
    const accentFiles = {
      'American English': { original: 'Indian_Accent_matt.mp3', transformed: 'American English_matt.mp3' },
      'Australian English': { original: 'Indian_English.mp3', transformed: 'Australian_English.mp3' },
      'British English': { original: 'Indian_English_james.mp3', transformed: 'British English_James.mp3' }
    };

    const updateIcons = (isPlaying) => {
        if (playIcon) playIcon.style.display = isPlaying ? 'none' : 'flex';
        if (pauseIcon) pauseIcon.style.display = isPlaying ? 'flex' : 'none';
    };

    const resolveUrl = () => {
      const sample = document.querySelector('input[name="Accent-Transformation"]:checked')?.value || 'American English';
      const isTransformed = toggle?.checked;
      const fileSet = accentFiles[sample];
      if (!fileSet) {
        console.error("Accent Player: Could not find files for sample:", sample);
        return null;
      }
      const fileName = isTransformed ? fileSet.transformed : fileSet.original;
      return AUDIO_CDN_BASE + fileName;
    };

    const handleControlChange = () => {
      const desiredUrl = resolveUrl();
      if (desiredUrl && !decodeURIComponent(audioEl.src).endsWith(desiredUrl)) {
        const oldTime = audioEl.currentTime;
        const wasPlaying = !audioEl.paused && !audioEl.ended;
        audioEl.src = desiredUrl;
        audioEl.addEventListener('loadedmetadata', () => {
          audioEl.currentTime = oldTime;
          if (wasPlaying) {
            audioEl.play().catch(e => console.error("Autoplay after switch failed.", e));
          }
        }, { once: true });
      }
    };

    playPauseBtn.addEventListener('click', () => {
      const desiredUrl = resolveUrl();
      if (!decodeURIComponent(audioEl.src).endsWith(desiredUrl)) {
        audioEl.src = desiredUrl;
        audioEl.play().catch(e => console.error("Playback failed.", e));
      } else {
        if (audioEl.paused) {
          audioEl.play().catch(e => console.error("Playback failed.", e));
        } else {
          audioEl.pause();
        }
      }
    });

    controlRadios.forEach(r => r.addEventListener('change', handleControlChange));
    if (toggle) toggle.addEventListener('change', handleControlChange);

    // ▼▼▼ CHANGE #2: Use the shared list to pause other players ▼▼▼
    audioEl.onplay = () => {
      allAudioPlayers.forEach(p => p !== audioEl && !p.paused && p.pause());
      updateIcons(true);
    };

    audioEl.onpause = () => updateIcons(false);
    audioEl.onended = () => { updateIcons(false); if(slider) slider.value = 0; };
    audioEl.addEventListener('timeupdate', () => {
      if (slider && isFinite(audioEl.duration)) {
        slider.value = (audioEl.currentTime / audioEl.duration) * 100;
      }
    });
    if (slider) {
      slider.addEventListener('input', () => {
        if (isFinite(audioEl.duration)) {
          audioEl.currentTime = (slider.value / 100) * audioEl.duration;
        }
      });
    }

    // Initial setup
    updateIcons(false);
    audioEl.src = resolveUrl();
} 
  
    // ===================================================================
    // Phone Call Trigger Logic (Indian Numbers Only)
    // ===================================================================
    function initIndianPhoneCallTrigger() {
        const callTriggerForm = document.getElementById('wf-form-Home-Hero-Demo');
        if (!callTriggerForm) return;

        const phoneInputField = document.getElementById('hero-form-field');
        const callSubmitButton = document.getElementById('hero-form-button');
        
        callTriggerForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            if (callSubmitButton.classList.contains('is-loading')) return;

            const phoneNumber = phoneInputField.value.trim();
            // Validate Indian phone number (10 digits)
            if (!/^\d{10}$/.test(phoneNumber)) {
                console.warn("Invalid phone number format. Please enter a 10-digit Indian phone number.");
                return;
            }

            // Fixed Indian bot ID and country code
            const indiaBotId = '825003a4d58a42fcac11e68d52346547';
            const countryCode = '+91'; // Fixed to India only
            const apiUrl = `https://api.inya.ai/genbots/website_trigger_call/${indiaBotId}`;

            // Rate limiting logic
            const rateLimitStorageKey = 'apiCallRateLimit';
            const MAX_CALLS = 5;
            const TEN_MINUTES_IN_MS = 10 * 60 * 1000;
            let callData = JSON.parse(localStorage.getItem(rateLimitStorageKey)) || { count: 0, timestamp: 0 };
            
            if (Date.now() - callData.timestamp > TEN_MINUTES_IN_MS) {
                localStorage.removeItem(rateLimitStorageKey);
                callData = { count: 0, timestamp: 0 };
            }

            if (callData.count >= MAX_CALLS) {
                console.warn("Rate limit reached. Please try again later.");
                return;
            }

            callSubmitButton.disabled = true;
            callSubmitButton.classList.add('is-loading');

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST', 
                    headers: { 
                        'accept': 'application/json', 
                        'content-type': 'application/json' 
                    },
                    body: JSON.stringify({ 
                        phone: phoneNumber, 
                        name: "", 
                        countryCode: countryCode 
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`API request failed: ${response.statusText}`);
                }
                
                callSubmitButton.classList.add('is-success');
                if (callData.count === 0) callData.timestamp = Date.now();
                callData.count++;
                localStorage.setItem(rateLimitStorageKey, JSON.stringify(callData));
                
            } catch (error) {
                console.error("Phone call trigger error:", error);
                callSubmitButton.classList.add('is-failure');
            } finally {
                callSubmitButton.classList.remove('is-loading');
                
                setTimeout(() => {
                    callSubmitButton.classList.remove('is-success', 'is-failure');
                    callSubmitButton.disabled = false;
                }, 3000);
            }
        });
    }

    // ===================================================================
    // Initialize All Features
    // ===================================================================
    initAllAudioPlayers();
    initAccentPlayerLogic();
    initIndianPhoneCallTrigger();
  
  });