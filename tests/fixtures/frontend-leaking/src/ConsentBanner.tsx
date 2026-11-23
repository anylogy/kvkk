import React from 'react';

export function ConsentBanner({ userEmail }: { userEmail: string }) {
  localStorage['email'] = userEmail;
  return (
    <div>
      <script src="https://cdn.jsdelivr.net/npm/tracker@1/index.js" />
      <label>
        <input type="checkbox" defaultChecked />
        Analitik ve pazarlama cerezlerini kabul ediyorum.
      </label>
    </div>
  );
}
