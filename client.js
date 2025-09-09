const API_URL = "https://script.google.com/macros/s/AKfycbyd3jl_Rj3qza7W4OMYwyIr3L4m2JhOPxzsg8xaAbWbPY-xB-cq4Z_TVp9tnE0Ltlcy/exec";

const urlParams = new URLSearchParams(window.location.search);
const clientId = urlParams.get("id");

// טוען נתוני לקוח
async function loadClient() {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "getClientData", clientId }),
      headers: { "Content-Type": "application/json" }
    });
    const data = await response.json();

    if (data.error) {
      document.getElementById("app").innerHTML = `<p>${data.error}</p>`;
      return;
    }

    document.getElementById("client-name").textContent = data["שם לקוח"];
    document.getElementById("orders").innerHTML = `
      <p>כתובת: ${data["כתובת"]}</p>
      <p>מכולה: ${data["מכולה"]}</p>
      <p>סטטוס: ${data["סטטוס"]}</p>
    `;
  } catch (err) {
    console.error(err);
    alert("שגיאה בטעינת נתוני הלקוח");
  }
}

document.getElementById("request-pickup").addEventListener("click", () => {
  alert("בקשת פינוי נשלחה");
  // כאן נוסיף שליחת בקשה לשרת
});

document.getElementById("request-swap").addEventListener("click", () => {
  alert("בקשת החלפה נשלחה");
  // כאן נוסיף שליחת בקשה לשרת
});

loadClient();
