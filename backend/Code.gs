/**
 * Guarda una playlist compartida al Google Sheet amb un UUID com a ID públic.
 * Estructura de columnes:
 * A: uuid
 * B: nom
 * C: urls (separades per comes)
 * D: data de creació
 * E: token reCAPTCHA (opcional)
 * F: IP/altres metadades (opcional)
 */
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('No s\'ha rebut cap payload JSON.');
    }

    var json = JSON.parse(e.postData.contents);
    var nom = String(json.nom || '').trim();
    var urls = Array.isArray(json.urls) ? json.urls : [];

    if (!nom) {
      throw new Error('El camp "nom" és obligatori.');
    }

    if (urls.length === 0) {
      throw new Error('El camp "urls" ha de contenir almenys un element.');
    }

    // 1) Generar ID únic no predictible.
    var uniqueId = Utilities.getUuid();

    // 2) Preparar dades amb UUID a la primera columna.
    var rowData = [
      uniqueId,
      nom,
      urls.join(','),
      new Date(),
      json.recaptchaToken || '',
      json.ip || ''
    ];

    // 3) Guardar fila.
    sheet.appendRow(rowData);

    // 4) Retornar UUID al frontend.
    return jsonOutput({
      status: 'success',
      id: uniqueId,
      message: 'Llista guardada'
    });
  } catch (error) {
    return jsonOutput({
      status: 'error',
      message: error.toString()
    });
  }
}

/**
 * Recupera una playlist compartida pel seu UUID (columna A).
 * URL d'exemple: .../exec?id=123e4567-e89b-12d3-a456-426614174000
 */
function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var id = e && e.parameter ? String(e.parameter.id || '').trim() : '';

  if (!id) {
    return jsonOutput({
      status: 'error',
      message: 'Falta ID'
    });
  }

  // Cerca exacta del UUID a la columna A.
  var finder = sheet
    .getRange('A:A')
    .createTextFinder(id)
    .matchEntireCell(true)
    .matchCase(false);

  var result = finder.findNext();

  if (!result) {
    return jsonOutput({
      status: 'error',
      message: 'Llista no trobada'
    });
  }

  var row = result.getRow();
  var rowValues = sheet.getRange(row, 1, 1, 6).getValues()[0];

  var response = {
    status: 'success',
    id: rowValues[0] || '',
    nom: rowValues[1] || '',
    urls: rowValues[2] || '',
    ids: rowValues[2] || '', // Compatibilitat amb frontend existent.
    createdAt: rowValues[3] || ''
  };

  return jsonOutput(response);
}

/**
 * Helper per generar respostes JSON consistents.
 */
function jsonOutput(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
