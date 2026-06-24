import { jsPDF } from 'jspdf';
import { Member, ScheduleItem } from '../types';

function monthKey(date: string) {
  return date.slice(0, 7);
}

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
}

function getMonthDays(year: number, month: number) {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const days: Array<Date | null> = [];
  for (let i = 0; i < first.getDay(); i += 1) days.push(null);
  for (let d = 1; d <= last.getDate(); d += 1) days.push(new Date(year, month - 1, d));
  while (days.length < 42) days.push(null);
  return days;
}

function calculateDayRequiredHeight(
  doc: jsPDF,
  date: Date | null,
  events: Array<{ time: string; eventName: string; memberIds: string[] }>,
  memberNameById: Record<string, string>,
  textWidth: number
) {
  if (!date) return 18;

  let needed = 8;
  events.forEach((event) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const eventLines = doc.splitTextToSize(`${event.time} - ${event.eventName}`, textWidth) as string[];

    doc.setFontSize(7.2);
    const names = event.memberIds.map((id) => memberNameById[id] || 'Integrante').join(', ');
    const namesLines = doc.splitTextToSize(names || 'Sem integrantes definidos', textWidth) as string[];

    needed += eventLines.length * 3.3;
    needed += namesLines.length * 3.0;
    needed += 2.2;
  });

  return Math.max(needed + 2, 18);
}

export function buildSchedulePdf(
  schedule: ScheduleItem[],
  members: Member[],
  periodStart: string,
  periodEnd: string
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const groupedByMonth = schedule.reduce((acc, item) => {
    const key = monthKey(item.date);
    acc[key] = acc[key] ?? [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, ScheduleItem[]>);

  const monthKeys = Object.keys(groupedByMonth).sort();
  const memberNameById = members.reduce((acc, member) => {
    acc[member.id] = member.nickname || member.name;
    return acc;
  }, {} as Record<string, string>);

  if (monthKeys.length === 0) {
    doc.setFontSize(16);
    doc.text('Diacolindos', 14, 20);
    doc.setFontSize(14);
    doc.text('Escala de Diáconos', 14, 28);
    doc.setFontSize(11);
    doc.text('Nenhum evento no período selecionado.', 14, 38);
  } else {
    const dayHeaders = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const marginX = 10;
    const calendarTop = 44;
    const usableWidth = 190;
    const cellWidth = usableWidth / 7;
    const innerPaddingX = 1.8;
    const innerPaddingY = 1.6;

    monthKeys.forEach((key, idx) => {
      if (idx > 0) doc.addPage();

      doc.setFontSize(16);
      doc.text('Diacolindos', 14, 21);
      doc.setFontSize(14);
      doc.text('Escala de Diáconos', 14, 28);
      doc.setFontSize(10);
      doc.text(`Período: ${periodStart} a ${periodEnd}`, 14, 34);
      doc.setFontSize(12);
      doc.text(monthLabel(key), 14, 38);

      dayHeaders.forEach((day, dayIdx) => {
        const x = marginX + dayIdx * cellWidth;
        doc.setFillColor(240, 253, 244);
        doc.rect(x, calendarTop, cellWidth, 8, 'F');
        doc.setFontSize(9);
        doc.text(day, x + 2, calendarTop + 5.5);
      });

      const [year, month] = key.split('-').map(Number);
      const monthDays = getMonthDays(year, month);
      const eventsByDate = groupedByMonth[key].reduce((acc, item) => {
        acc[item.date] = acc[item.date] ?? [];
        acc[item.date].push(item);
        return acc;
      }, {} as Record<string, ScheduleItem[]>);

      const weeks = Array.from({ length: 6 }, (_, row) => monthDays.slice(row * 7, row * 7 + 7));
      let currentY = calendarTop + 8;

      weeks.forEach((week) => {
        const requiredHeights = week.map((date) => {
          const isoDate = date ? date.toISOString().slice(0, 10) : '';
          const events = date ? (eventsByDate[isoDate] ?? []).sort((a, b) => a.time.localeCompare(b.time)) : [];
          return calculateDayRequiredHeight(doc, date, events, memberNameById, cellWidth - (innerPaddingX * 2));
        });
        const rowHeight = Math.max(...requiredHeights, 24);

        if (currentY + rowHeight > 286) {
          doc.addPage();
          doc.setFontSize(12);
          doc.text(`${monthLabel(key)} (continuação)`, 14, 16);
          dayHeaders.forEach((day, dayIdx) => {
            const x = marginX + dayIdx * cellWidth;
            doc.setFillColor(240, 253, 244);
            doc.rect(x, 22, cellWidth, 8, 'F');
            doc.setFontSize(9);
            doc.text(day, x + 2, 27.5);
          });
          currentY = 30;
        }

        week.forEach((date, col) => {
          const x = marginX + col * cellWidth;
          const yCell = currentY;
          doc.rect(x, yCell, cellWidth, rowHeight);

          if (!date) return;

          const isoDate = date.toISOString().slice(0, 10);
          const events = (eventsByDate[isoDate] ?? []).sort((a, b) => a.time.localeCompare(b.time));

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10.5);
          doc.text(String(date.getDate()), x + innerPaddingX, yCell + 4.2);

          let yText = yCell + 7.3;
          events.forEach((event) => {
            const eventLine = `${event.time} - ${event.eventName}`;
            const namesLine = event.memberIds.map((id) => memberNameById[id] || 'Integrante').join(', ') || 'Sem integrantes definidos';

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            const eventLines = doc.splitTextToSize(eventLine, cellWidth - (innerPaddingX * 2)) as string[];
            eventLines.forEach((line) => {
              doc.text(line, x + innerPaddingX, yText);
              yText += 3.3;
            });

            doc.setFontSize(7.2);
            const namesLines = doc.splitTextToSize(namesLine, cellWidth - (innerPaddingX * 2)) as string[];
            namesLines.forEach((line) => {
              doc.text(line, x + innerPaddingX, yText);
              yText += 3.0;
            });

            yText += innerPaddingY;
          });
        });

        currentY += rowHeight;
      });
    });
  }

  const isoDate = new Date().toISOString().slice(0, 10);
  const fileName = `escala-diacolindos-${isoDate}.pdf`;
  const pdfDataUrl = doc.output('datauristring');

  return { doc, fileName, pdfDataUrl };
}
