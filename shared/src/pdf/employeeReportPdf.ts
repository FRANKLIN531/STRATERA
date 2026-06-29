import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Employee, AttendanceRecord, LeaveRequest, PayrollRecord } from '../api/types';
import { addBrandedHeader, addFooter, formatMoney, savePdf } from './branding';

export type EmployeeReportData = {
  employee: Employee;
  attendance: AttendanceRecord[];
  leave: LeaveRequest[];
  payroll: PayrollRecord[];
};

export function exportEmployeeReportPdf(data: EmployeeReportData): void {
  const doc = new jsPDF();
  const { employee } = data;
  const startY = addBrandedHeader(
    doc,
    'Employee Report',
    `${employee.name} (${employee.id})`,
  );

  doc.setFontSize(10);
  let y = startY;
  const lines = [
    `Department: ${employee.department}`,
    `Position: ${employee.positionTitle ?? employee.role}`,
    `Email: ${employee.email}`,
    `Status: ${employee.status}`,
    `Join Date: ${employee.joinDate}`,
    `Monthly Salary: ${formatMoney(employee.salary)}`,
  ];
  for (const line of lines) {
    doc.text(line, 14, y);
    y += 6;
  }

  const presentDays = data.attendance.filter((a) => a.status === 'Present').length;
  const totalHours = data.attendance.reduce((s, a) => s + a.hours, 0);
  const approvedLeave = data.leave.filter((l) => l.status === 'Approved').length;

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 14, y);
  doc.setFont('helvetica', 'normal');
  y += 7;
  doc.text(`Attendance records: ${data.attendance.length} (${presentDays} present, ${totalHours}h total)`, 14, y);
  y += 6;
  doc.text(`Leave requests: ${data.leave.length} (${approvedLeave} approved)`, 14, y);
  y += 6;
  doc.text(`Payroll records: ${data.payroll.length}`, 14, y);

  if (data.attendance.length > 0) {
    autoTable(doc, {
      startY: y + 8,
      head: [['Date', 'Check In', 'Check Out', 'Hours', 'Status']],
      body: data.attendance.slice(0, 15).map((a) => [
        a.date,
        a.checkIn,
        a.checkOut,
        a.hours > 0 ? `${a.hours}h` : '—',
        a.status,
      ]),
      headStyles: { fillColor: [0, 27, 58], textColor: 255 },
      styles: { fontSize: 9 },
      theme: 'grid',
    });
    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  }

  if (data.payroll.length > 0) {
    autoTable(doc, {
      startY: y + 10,
      head: [['Payroll ID', 'Base', 'Bonus', 'Deductions', 'Net Pay', 'Status']],
      body: data.payroll.map((p) => [
        p.id,
        formatMoney(p.baseSalary),
        formatMoney(p.bonus),
        formatMoney(p.deductions),
        formatMoney(p.netPay),
        p.status,
      ]),
      headStyles: { fillColor: [0, 27, 58], textColor: 255 },
      styles: { fontSize: 9 },
      theme: 'grid',
    });
  }

  addFooter(doc);
  savePdf(doc, `STRATERA-Employee-${employee.id}.pdf`);
}

export function exportEmployeesDirectoryPdf(employees: Employee[]): void {
  const doc = new jsPDF();
  const startY = addBrandedHeader(doc, 'Employee Directory', `${employees.length} employees`);

  autoTable(doc, {
    startY,
    head: [['ID', 'Name', 'Department', 'Position', 'Email', 'Status', 'Salary']],
    body: employees.map((e) => [
      e.id,
      e.name,
      e.department,
      e.positionTitle ?? e.role,
      e.email,
      e.status,
      formatMoney(e.salary),
    ]),
    headStyles: { fillColor: [0, 27, 58], textColor: 255 },
    styles: { fontSize: 8 },
  });

  addFooter(doc);
  savePdf(doc, `STRATERA-Employee-Directory.pdf`);
}
