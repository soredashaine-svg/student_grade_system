// =========================================================
// Student Grade Management System
// Each student: { id, studentNo, name, prelim, midterm, finals }
// The final grade, equivalent grade, and remarks are computed by functions,
// so they are always correct even after editing a score.
// =========================================================

const STORAGE_KEY = "grade-system-students";
const PASSING_SCORE = 75;

// Weights of each grading period (must add up to 1.00)
const WEIGHTS = { prelim: 0.30, midterm: 0.30, finals: 0.40 };

// Grading scale: the lowest score needed for each grade
const SCALE = [
  { min: 97, grade: "1.00" },
  { min: 94, grade: "1.25" },
  { min: 91, grade: "1.50" },
  { min: 88, grade: "1.75" },
  { min: 85, grade: "2.00" },
  { min: 82, grade: "2.25" },
  { min: 79, grade: "2.50" },
  { min: 76, grade: "2.75" },
  { min: 75, grade: "3.00" },
  { min: 0,  grade: "5.00" }
];

// ---------- 1. Computing grades ----------
function computeFinal(student) {
  const total = student.prelim * WEIGHTS.prelim +
                student.midterm * WEIGHTS.midterm +
                student.finals * WEIGHTS.finals;
  return Math.round(total * 100) / 100;      // round to 2 decimal places
}

function equivalentGrade(finalScore) {
  for (let i = 0; i < SCALE.length; i++) {
    if (finalScore >= SCALE[i].min) return SCALE[i].grade;
  }
  return "5.00";
}

function remarks(finalScore) {
  return finalScore >= PASSING_SCORE ? "Passed" : "Failed";
}

// ---------- 2. Saving and loading ----------
function loadStudents() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch (e) { return []; }
}
function saveStudents() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(students)); } catch (e) { /* ignore */ }
}

let students = loadStudents();
let editingId = null;     // id of the student being edited, or null when adding

// ---------- 3. Elements ----------
const form = document.getElementById("studentForm");
const formTitle = document.getElementById("formTitle");
const formError = document.getElementById("formError");
const saveButton = document.getElementById("saveButton");
const cancelEdit = document.getElementById("cancelEdit");
const rows = document.getElementById("studentRows");
const searchInput = document.getElementById("searchInput");
const remarkFilter = document.getElementById("remarkFilter");
const sortSelect = document.getElementById("sortSelect");

// ---------- 4. Validation ----------
// Returns an error message, or "" if the data is valid
function validate(data) {
  if (data.studentNo === "") return "Please enter the student number.";
  if (data.name.length < 2) return "Please enter the student's full name.";

  const duplicate = students.some(function (s) {
    return s.studentNo.toLowerCase() === data.studentNo.toLowerCase() && s.id !== editingId;
  });
  if (duplicate) return "That student number is already in the list.";

  const periods = ["prelim", "midterm", "finals"];
  for (let i = 0; i < periods.length; i++) {
    const score = data[periods[i]];
    if (isNaN(score)) return "Please enter all three grades.";
    if (score < 0 || score > 100) return "Grades must be from 0 to 100.";
  }
  return "";
}

// ---------- 5. Drawing the table and summary ----------
function getVisibleStudents() {
  const search = searchInput.value.trim().toLowerCase();
  const filter = remarkFilter.value;

  const list = students.filter(function (s) {
    const matchesSearch = s.name.toLowerCase().includes(search) || s.studentNo.toLowerCase().includes(search);
    const matchesFilter = filter === "all" || remarks(computeFinal(s)) === filter;
    return matchesSearch && matchesFilter;
  });

  if (sortSelect.value === "name") list.sort(function (a, b) { return a.name.localeCompare(b.name); });
  if (sortSelect.value === "grade-desc") list.sort(function (a, b) { return computeFinal(b) - computeFinal(a); });
  if (sortSelect.value === "grade-asc") list.sort(function (a, b) { return computeFinal(a) - computeFinal(b); });
  return list;
}

function render() {
  rows.innerHTML = "";
  const visible = getVisibleStudents();

  visible.forEach(function (s) {
    const final = computeFinal(s);
    const remark = remarks(final);
    const tr = document.createElement("tr");
    if (s.id === editingId) tr.className = "editing";

    // Text cells: textContent keeps user input safe
    [s.studentNo, s.name, s.prelim, s.midterm, s.finals, final.toFixed(2), equivalentGrade(final)].forEach(function (value) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    });

    const remarkCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "badge " + remark.toLowerCase();
    badge.textContent = remark;
    remarkCell.appendChild(badge);
    tr.appendChild(remarkCell);

    const actions = document.createElement("td");
    actions.className = "actions";
    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", function () { startEdit(s.id); });
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "danger";
    deleteBtn.addEventListener("click", function () { deleteStudent(s.id); });
    actions.append(editBtn, deleteBtn);
    tr.appendChild(actions);

    rows.appendChild(tr);
  });

  const empty = document.getElementById("emptyMessage");
  empty.hidden = visible.length > 0;
  empty.textContent = students.length === 0 ? "No students yet. Add one using the form." : "No students match your search.";
  document.getElementById("loadSample").hidden = students.length > 0;

  renderSummary();
}

function renderSummary() {
  const finals = students.map(computeFinal);
  const passed = finals.filter(function (f) { return f >= PASSING_SCORE; }).length;

  document.getElementById("statCount").textContent = students.length;
  document.getElementById("statPassFail").textContent = passed + " / " + (students.length - passed);

  if (students.length === 0) {
    document.getElementById("statAverage").textContent = "–";
    document.getElementById("statHighest").textContent = "–";
    return;
  }
  const sum = finals.reduce(function (a, b) { return a + b; }, 0);
  document.getElementById("statAverage").textContent = (sum / finals.length).toFixed(2);
  document.getElementById("statHighest").textContent = Math.max.apply(null, finals).toFixed(2);
}

// ---------- 6. Add, edit, delete ----------
function readForm() {
  const f = form.elements;
  return {
    studentNo: f.studentNo.value.trim(),
    name: f.name.value.trim().replace(/\s+/g, " "),
    prelim: parseFloat(f.prelim.value),
    midterm: parseFloat(f.midterm.value),
    finals: parseFloat(f.finals.value)
  };
}

function resetForm() {
  form.reset();
  editingId = null;
  formTitle.textContent = "Add Student";
  saveButton.textContent = "Add Student";
  cancelEdit.hidden = true;
  formError.textContent = "";
}

function startEdit(id) {
  const s = students.find(function (x) { return x.id === id; });
  editingId = id;
  const f = form.elements;
  f.studentNo.value = s.studentNo;
  f.name.value = s.name;
  f.prelim.value = s.prelim;
  f.midterm.value = s.midterm;
  f.finals.value = s.finals;
  formTitle.textContent = "Edit Student";
  saveButton.textContent = "Save Changes";
  cancelEdit.hidden = false;
  formError.textContent = "";
  f.name.focus();
  render();
}

function deleteStudent(id) {
  const s = students.find(function (x) { return x.id === id; });
  if (!confirm("Delete " + s.name + "?")) return;
  students = students.filter(function (x) { return x.id !== id; });
  if (editingId === id) resetForm();
  saveStudents();
  render();
}

form.addEventListener("submit", function (e) {
  e.preventDefault();
  const data = readForm();
  const error = validate(data);
  if (error) {
    formError.textContent = error;
    return;
  }

  if (editingId) {
    const s = students.find(function (x) { return x.id === editingId; });
    Object.assign(s, data);
  } else {
    data.id = Date.now().toString();
    students.push(data);
  }

  saveStudents();
  resetForm();
  render();
});

cancelEdit.addEventListener("click", function () { resetForm(); render(); });
searchInput.addEventListener("input", render);
remarkFilter.addEventListener("change", render);
sortSelect.addEventListener("change", render);

// ---------- 7. Export to CSV (opens in Excel) ----------
document.getElementById("exportCsv").addEventListener("click", function () {
  if (students.length === 0) {
    alert("There are no students to export.");
    return;
  }
  const header = ["Student No.", "Name", "Prelim", "Midterm", "Finals", "Final %", "Grade", "Remarks"];
  const lines = [header];
  students.forEach(function (s) {
    const final = computeFinal(s);
    lines.push([s.studentNo, s.name, s.prelim, s.midterm, s.finals, final.toFixed(2), equivalentGrade(final), remarks(final)]);
  });
  // Put quotes around every value so names with commas stay in one cell
  const csv = lines.map(function (line) {
    return line.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(",");
  }).join("\r\n");

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "class-record.csv";
  link.click();
  URL.revokeObjectURL(link.href);
});

// ---------- 8. Sample data (for trying the app quickly) ----------
document.getElementById("loadSample").addEventListener("click", function () {
  const sample = [
    ["2024-00101", "Ana Santos", 92, 95, 96],
    ["2024-00102", "Ben Reyes", 78, 80, 77],
    ["2024-00103", "Carla Mendoza", 88, 84, 90],
    ["2024-00104", "Dan Villanueva", 70, 68, 74],
    ["2024-00105", "Ella Cruz", 85, 87, 82]
  ];
  students = sample.map(function (row, i) {
    return { id: (Date.now() + i).toString(), studentNo: row[0], name: row[1], prelim: row[2], midterm: row[3], finals: row[4] };
  });
  saveStudents();
  render();
});

// ---------- 9. Start ----------
// Fill the grading scale table
SCALE.forEach(function (step, i) {
  const tr = document.createElement("tr");
  const range = i === 0 ? step.min + "–100" : step.min + "–" + (SCALE[i - 1].min - 0.01).toFixed(2);
  tr.innerHTML = "<td>" + range + "</td><td>" + step.grade + "</td>";
  document.getElementById("scaleTable").appendChild(tr);
});

render();