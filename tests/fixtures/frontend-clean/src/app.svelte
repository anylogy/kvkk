<script>
  let consentMarketing = false;
  const apiUrl = 'https://app.example.com.tr/api/v1/health';

  function saveUiTheme(theme) {
    localStorage.setItem('ui_theme', theme);
  }
</script>

<main>
  <a href={apiUrl}>Status</a>
  <label>
    <input type="checkbox" bind:checked={consentMarketing} />
    Acik Riza onayim var
  </label>
  <button on:click={() => saveUiTheme('light')}>Tema</button>
</main>
