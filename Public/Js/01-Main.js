// --- 1. فتح وإغلاق القائمة الجانبية (SideBar) ---
const ToggleSideBarBtn = document.getElementById('ToggleSideBarBtn');
ToggleSideBarBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  document.body.classList.toggle('SideBar-Small')
});

document.querySelectorAll('.Dropdown-Trigger').forEach(trigger => {
  trigger.addEventListener('click', function () {
    const parent = this.parentElement;
    parent.classList.toggle('active');
  });
});

const ChangeMoodBtn = document.getElementById('ChangeMood');
ChangeMoodBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  ChangeMood()
});

function ChangeMood() {
  document.body.classList.toggle('Dark-Mood');
  let SunIcon = ChangeMoodBtn.querySelector("i");
  if (SunIcon.classList.contains("fa-sun")) {
    SunIcon.classList.replace('fa-sun', 'fa-moon');
  } else {
    SunIcon.classList.replace('fa-moon', 'fa-sun');
  }
}


// --- 2. التحكم بالقوائم المنسدلة (Profile & Notifications) ---
const userMenuTrigger = document.getElementById('userMenuTrigger');
const ProfileDropdown = document.getElementById('ProfileDropdown');
const NotificationTrigger = document.getElementById('NotificationTrigger');
const NotificationDropdown = document.getElementById('NotificationDropdown');
const MarkAllReadBtn = document.getElementById('MarkAllReadBtn');

userMenuTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  NotificationDropdown.classList.remove('active');
  ProfileDropdown.classList.toggle('active');
});

NotificationTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  ProfileDropdown.classList.remove('active');
  NotificationDropdown.classList.toggle('active');
});

MarkAllReadBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  document.querySelectorAll('.Notification-Item.unread').forEach(item => item.classList.remove('unread'));
  const dot = document.querySelector('.Notification-Icon .Notification-Dot');
  if (dot) dot.style.display = 'none';
});

document.addEventListener('click', (e) => {
  ProfileDropdown.classList.remove('active');
  NotificationDropdown.classList.remove('active');
  const SideBar = document.getElementById('SideBar');
  if (document.body.classList.contains('SideBar-mobile-open') && !SideBar.contains(e.target)) {
    document.body.classList.remove('SideBar-mobile-open');
  }
});

document.addEventListener('keydown', function (event) {
  console.log(event.key)
  if (event.ctrlKey && event.key === 's') { event.preventDefault(); }
  if (event.altKey && event.key === 'm') { document.body.classList.toggle('SideBar-Small') }

  if (event.key === 'F2') { event.preventDefault(); ChangeMood() }
  if (event.key === "Home") { event.preventDefault(); location.href = "index.html" }
});


// document.querySelector("body").innerHTML += `<div id="PrintArea"></div>`
function PrintAreaFn(MyElement) {
  const PrintElement = document.querySelector(`${MyElement}`);
  const PrintArea = document.getElementById("PrintArea");
  PrintArea.innerHTML = `${PrintElement.innerHTML}`;
  window.print();
  PrintArea.innerHTML = "";
}


document.addEventListener("DOMContentLoaded", () => {
  const dateInputs = document.querySelectorAll('input[type="date"]');
  if (!dateInputs.length) return;
  const today = new Date().toISOString().split("T")[0];
  dateInputs.forEach(input => { if (!input.value) { input.value = today; } });
});