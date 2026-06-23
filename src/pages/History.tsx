import { useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import logoIPB from '../assets/logo-ipb.svg';
import { useAppState } from '../hooks/useAppState';

async function svgToPngDataUrl(svgUrl: string): Promise<string | null> {
  try {
    const svgText = await fetch(svgUrl).then((res) => res.text());
    const blob = new Blob([svgText], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(url);
      return null;
    }
    ctx.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    URL.revokeObjectURL(url);
    return dataUrl;
  } catch {
    return null;
  }
}

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

  let needed = 8; // espaço para o número do dia

  events.forEach((event) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const eventLine = `${event.time} - ${event.eventName}`;
    const eventLines = doc.splitTextToSize(eventLine, textWidth) as string[];

    doc.setFontSize(7.2);
    const names = event.memberIds.map((id) => memberNameById[id] || 'Integrante').join(', ');
    const namesLines = doc.splitTextToSize(names || 'Sem integrantes definidos', textWidth) as string[];

    needed += eventLines.length * 3.3;
    needed += namesLines.length * 3.0;
    needed += 2.2; // espaçamento entre eventos
  });

  return Math.max(needed + 2, 18);
}

export function HistoryPage() {
  const { history, schedule, members } = useAppState();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredSchedule = useMemo(
    () => schedule.filter((item) => {
      if (startDate && item.date < startDate) return false;
      if (endDate && item.date > endDate) return false;
      return true;
    }),
    [schedule, startDate, endDate]
  );

  const filteredHistory = useMemo(
    () => history.filter((item) => {
      if (startDate && item.eventDate < startDate) return false;
      if (endDate && item.eventDate > endDate) return false;
      return true;
    }),
    [history, startDate, endDate]
  );

  const exportPdf = async () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const groupedByMonth = filteredSchedule.reduce((acc, item) => {
      const key = monthKey(item.date);
      acc[key] = acc[key] ?? [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, typeof filteredSchedule>);

    const monthKeys = Object.keys(groupedByMonth).sort();
    const memberNameById = members.reduce((acc, member) => {
      acc[member.id] = member.nickname || member.name;
      return acc;
    }, {} as Record<string, string>);

    if (monthKeys.length === 0) {
      doc.setFontSize(16);
      doc.text('Escala de Diáconos', 14, 20);
      doc.setFontSize(11);
      doc.text('Nenhum evento no período selecionado.', 14, 30);
      doc.save('escala-diacolindos.pdf');
      return;
    }

    const logoData = await svgToPngDataUrl(logoIPB);
    const dayHeaders = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const marginX = 10;
    const calendarTop = 44;
    const usableWidth = 190;
    const cellWidth = usableWidth / 7;
    const innerPaddingX = 1.8;
    const innerPaddingY = 1.6;

    monthKeys.forEach((key, idx) => {
      if (idx > 0) doc.addPage();

      let y = 14;
      if (logoData) {
        doc.addImage(logoData, 'PNG', 14, y, 40, 10);
      } else {
        doc.setFontSize(10);
        doc.text('Igreja Presbiteriana do Brasil', 14, y + 6);
      }

      doc.setFontSize(16);
      doc.text('Escala de Diáconos', 60, y + 7);
      doc.setFontSize(10);
      doc.text(`Período: ${startDate || 'início'} a ${endDate || 'fim'}`, 60, y + 13);
      doc.setFontSize(12);
      doc.text(monthLabel(key), 14, 34);

      dayHeaders.forEach((day, dayIdx) => {
        const x = marginX + dayIdx * cellWidth;
        doc.setFillColor(243, 244, 246);
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
      }, {} as Record<string, typeof filteredSchedule>);

      const weeks = Array.from({ length: 6 }, (_, row) => monthDays.slice(row * 7, row * 7 + 7));
      let currentY = calendarTop + 8;

      weeks.forEach((week, weekIndex) => {
        const requiredHeights = week.map((date) => {
          const isoDate = date ? date.toISOString().slice(0, 10) : '';
          const events = date ? (eventsByDate[isoDate] ?? []).sort((a, b) => a.time.localeCompare(b.time)) : [];
          return calculateDayRequiredHeight(doc, date, events, memberNameById, cellWidth - (innerPaddingX * 2));
        });
        const rowHeight = Math.max(...requiredHeights, 24);

        // Se não couber no espaço da página, quebra e continua o mesmo mês na próxima página.
        if (currentY + rowHeight > 286) {
          doc.addPage();
          doc.setFontSize(12);
          doc.text(`${monthLabel(key)} (continuação)`, 14, 16);
          dayHeaders.forEach((day, dayIdx) => {
            const x = marginX + dayIdx * cellWidth;
            doc.setFillColor(243, 244, 246);
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

    doc.save('escala-diacolindos.pdf');
  };

  return (
    <div className="container">
      <h1 className="page-title">Histórico de alterações</h1>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Exportação em PDF</h2>
        <div className="grid-2">
          <label>
            Data inicial
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label>
            Data final
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </label>
        </div>
        <p style={{ marginTop: 12, color: '#475569' }}>
          O PDF é gerado em formato de calendário mensal, mostrando apenas dia, horário, evento e integrantes escalados.
        </p>
        <button className="button" style={{ marginTop: 8 }} onClick={exportPdf}>Exportar escala em PDF</button>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Evento</th>
              <th>Alteração</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.length === 0 ? (
              <tr><td colSpan={4}>Nenhuma alteração registrada.</td></tr>
            ) : (
              filteredHistory.map((item) => (
                <tr key={item.id}>
                  <td>{item.eventDate} - {item.eventTime}</td>
                  <td>{item.eventName}</td>
                  <td>{item.originalMemberId}{' -> '}{item.substituteMemberId}</td>
                  <td>{item.reason ?? 'Sem motivo informado'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
