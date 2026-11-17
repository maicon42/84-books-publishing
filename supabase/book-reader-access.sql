-- 84 Books Publishing: PDFs privados até validação real de anúncios recompensados
-- Os PDFs continuam disponíveis para o administrador testar o leitor.
-- Os membros só receberão URLs temporárias através de uma função server-side
-- depois de o fornecedor confirmar a recompensa do anúncio.
drop policy if exists "84Books PDFs gratuitos para membros" on storage.objects;
