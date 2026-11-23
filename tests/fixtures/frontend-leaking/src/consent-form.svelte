<script>
  let acceptCookies = true;
  function persistUser(tckn) {
    localStorage.setItem('tckn', tckn);
    console.log('User tckn:', tckn);
  }
</script>

<input type="checkbox" checked={true} />
<button on:click={() => persistUser('12345678901')}>Kaydet</button>
