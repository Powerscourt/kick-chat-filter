(() => {
  'use strict';
  globalThis.KCF.translations = Object.freeze({
    en: Object.freeze({
      title: 'Kick Chat Filter', subtitle: 'Hide chat messages',
      language: 'Language', settings: 'Settings', chatStatus: 'Chat status',
      enabled: 'Filtering enabled', termLabel: 'Keyword or phrase to block', add: 'Add',
      terms: 'Blocked phrases', empty: 'No keywords yet. Add a word above to get started.',
      mode: 'Matching mode', substring: 'Any message containing the keyword', wholeWord: 'Whole words only',
      local: 'Hides messages only in this browser. Does not delete messages from the server.',
      validation: 'v0.1 preview · Some acceptance checks remain incomplete',
      emptyInput: 'Please enter a keyword or phrase.', duplicate: 'This phrase is already on the list.',
      added: 'Phrase added.', removed: 'Phrase removed.', saved: 'Saved.',
      remove: 'Remove', saveError: 'Could not save. Please try again.',
      loadError: 'Could not load settings. Please reopen the popup.',
      unsupported: 'Open a Kick tab to see its status and count.',
      unavailable: 'Cannot reach this tab. Refresh the Kick page after installing the extension.',
      waiting: 'Waiting for chat.', active: 'Watching chat.', disabled: 'Filtering is off.',
      selectorIssue: 'Some message layouts were not recognized; those messages remain visible.',
      storageError: 'Could not read settings; filtering has stopped.',
      count: 'Hidden now (mounted rows in this tab): '
    }),
    tr: Object.freeze({
    language: 'Dil', settings: 'Ayarlar', chatStatus: 'Sohbet durumu',
    title: 'Kick Chat Filter', subtitle: 'Sohbet mesajlarını gizle',
    enabled: 'Filtreleme aktif', termLabel: 'Engellenecek kelime veya ifade', add: 'Ekle',
    terms: 'Engellenen ifadeler', empty: 'Henüz kelime eklenmedi. Başlamak için yukarıya bir kelime yazın.',
    mode: 'Eşleşme biçimi', substring: 'Kelimeyi içeren tüm mesajlar', wholeWord: 'Yalnızca tam kelime',
    local: 'Yalnızca bu tarayıcıda gizler. Sunucudaki mesajları silmez.',
    validation: 'v0.1 önizleme · Tüm kabul kontrolleri tamamlanmadı',
    emptyInput: 'Lütfen bir kelime veya ifade yazın.', duplicate: 'Bu ifade zaten listede.',
    added: 'İfade eklendi.', removed: 'İfade kaldırıldı.', saved: 'Kaydedildi.',
    remove: 'Kaldır', saveError: 'Kaydedilemedi. Lütfen yeniden deneyin.',
    loadError: 'Ayarlar okunamadı. Açılır pencereyi yeniden açın.',
    unsupported: 'Durum ve sayaç için bir Kick sekmesi açın.',
    unavailable: 'Sekmeye erişilemiyor. Eklentiyi yükledikten sonra Kick sayfasını yenileyin.',
    waiting: 'Sohbet bekleniyor.', active: 'Sohbet izleniyor.', disabled: 'Filtreleme kapalı.',
    selectorIssue: 'Bazı mesaj yapıları tanınmadı; bu mesajlar görünür bırakıldı.',
    storageError: 'Ayarlar okunamadı; filtreleme durduruldu.',
    count: 'Şu anda gizli (bu sekmede, DOM’da): '
    })
  });
})();
