import { useMemo, useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { buildSchedulePdf } from '../utils/schedulePdf';

export function HistoryPage() {
  const { history, schedule, members, scalePdfHistory, deleteScalePdfHistory } = useAppState();
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

  const summary = useMemo(() => {
    const totalSchedules = scalePdfHistory.length;
    const totalChanges = history.length;
    const totalSwaps = history.filter((item) => item.originalMemberId && item.substituteMemberId && item.originalMemberId !== item.substituteMemberId).length;

    const sortedPdfHistory = [...scalePdfHistory].sort((a, b) => a.generatedAt.localeCompare(b.generatedAt));
    const lastRecord = sortedPdfHistory[sortedPdfHistory.length - 1];

    return {
      totalSchedules,
      totalChanges,
      totalSwaps,
      lastSchedule: lastRecord ? new Date(lastRecord.generatedAt).toLocaleString('pt-BR') : 'Nenhuma escala gerada',
      lastChange: history[0] ? new Date(history[0].changedAt).toLocaleString('pt-BR') : 'Sem alterações',
      latestPeriod: lastRecord ? `${lastRecord.periodStart} a ${lastRecord.periodEnd}` : 'Sem período',
      usedMembersCount: lastRecord ? lastRecord.usedMembersCount : 0,
    };
  }, [history, scalePdfHistory]);

  const exportPdf = () => {
    const periodStart = startDate || (filteredSchedule[0]?.date ?? new Date().toISOString().slice(0, 10));
    const periodEnd = endDate || (filteredSchedule[filteredSchedule.length - 1]?.date ?? new Date().toISOString().slice(0, 10));
    const { doc } = buildSchedulePdf(filteredSchedule, members, periodStart, periodEnd);
    doc.save(`escala-diacolindos-${periodStart}.pdf`);
  };

  const openPdf = (dataUrl: string) => {
    window.open(dataUrl, '_blank');
  };

  const downloadPdf = (dataUrl: string, fileName: string) => {
    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const handleDeleteRecord = (recordId: string) => {
    const confirmDelete = confirm('Tem certeza que deseja deletar este histórico? O PDF salvo desta escala também será removido.');
    if (!confirmDelete) return;
    deleteScalePdfHistory(recordId);
  };

  return (
    <div className="container">
      <h1 className="page-title">Histórico</h1>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Resumo rápido</h2>
        <div className="grid-3">
          <p>Total de escalas geradas: <strong>{summary.totalSchedules}</strong></p>
          <p>Total de alterações realizadas: <strong>{summary.totalChanges}</strong></p>
          <p>Total de trocas entre integrantes: <strong>{summary.totalSwaps}</strong></p>
          <p>Última escala gerada: <strong>{summary.lastSchedule}</strong></p>
          <p>Última alteração registrada: <strong>{summary.lastChange}</strong></p>
          <p>Período da escala mais recente: <strong>{summary.latestPeriod}</strong></p>
          <p>Total de integrantes utilizados na última escala: <strong>{summary.usedMembersCount}</strong></p>
        </div>
      </div>

      <div className="card export-card">
        <h2 style={{ marginTop: 0 }}>Exportação manual em PDF</h2>
        <p className="muted-text" style={{ margin: 0 }}>
          Selecione o período e exporte a escala manualmente com os dados atuais.
        </p>
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
        <div className="export-actions">
          <button className="button success" onClick={exportPdf}>Exportar escala em PDF</button>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Escalas geradas (PDFs salvos)</h2>
        <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Data de geração</th>
              <th>Período</th>
              <th>Arquivo</th>
              <th>Status</th>
              <th>Eventos</th>
              <th>Integrantes</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {scalePdfHistory.length === 0 ? (
              <tr><td colSpan={7}>Nenhuma escala salva no histórico ainda.</td></tr>
            ) : (
              scalePdfHistory.map((record) => (
                <tr key={record.id}>
                  <td>{new Date(record.generatedAt).toLocaleString('pt-BR')}</td>
                  <td>{record.periodStart} a {record.periodEnd}</td>
                  <td>{record.fileName}</td>
                  <td>{record.status}</td>
                  <td>{record.eventsCount}</td>
                  <td>{record.usedMembersCount}</td>
                  <td className="actions-cell">
                    <button className="small-button button success" onClick={() => openPdf(record.pdfDataUrl)}>Abrir PDF</button>
                    <button className="small-button button" onClick={() => downloadPdf(record.pdfDataUrl, record.fileName)}>Baixar PDF</button>
                    <button className="small-button button danger" onClick={() => handleDeleteRecord(record.id)}>Deletar histórico</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Alterações manuais recentes</h2>
        <div className="table-wrap">
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
    </div>
  );
}
