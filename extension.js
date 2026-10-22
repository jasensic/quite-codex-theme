const vscode = require('vscode');

const excludedCodeToken = 'excludedCode';
const scheduleSettings = 'quietCodexThemes.schedule';
const decoration = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  backgroundColor: new vscode.ThemeColor('quietCodexThemes.excludedCodeBackground'),
  color: new vscode.ThemeColor('quietCodexThemes.excludedCodeForeground')
});

const requestVersions = new WeakMap();
const pendingRefreshes = new Map();

function scheduledTheme(hour, lightStartHour, darkStartHour) {
  if (lightStartHour === darkStartHour) return 'Quiet Codex Dark';

  const isLightTime = lightStartHour < darkStartHour
    ? hour >= lightStartHour && hour < darkStartHour
    : hour >= lightStartHour || hour < darkStartHour;

  return isLightTime ? 'Quiet Codex Light' : 'Quiet Codex Dark';
}

async function applyScheduledTheme() {
  const configuration = vscode.workspace.getConfiguration('quietCodexThemes.schedule');
  if (!configuration.get('enabled', true)) return;

  const lightStartHour = configuration.get('lightStartHour', 10);
  const darkStartHour = configuration.get('darkStartHour', 19);
  const theme = scheduledTheme(new Date().getHours(), lightStartHour, darkStartHour);
  const workbench = vscode.workspace.getConfiguration('workbench');

  if (workbench.get('colorTheme') !== theme) {
    await workbench.update('colorTheme', theme, vscode.ConfigurationTarget.Global);
  }
}

function excludedCodeLines(tokens, legend) {
  const tokenTypeIndex = legend?.tokenTypes?.indexOf(excludedCodeToken) ?? -1;
  if (tokenTypeIndex < 0 || !tokens?.data) return [];

  const lines = new Set();
  let line = 0;
  let character = 0;

  for (let offset = 0; offset + 4 < tokens.data.length; offset += 5) {
    const deltaLine = tokens.data[offset];
    line += deltaLine;
    character = deltaLine === 0 ? character + tokens.data[offset + 1] : tokens.data[offset + 1];

    if (tokens.data[offset + 3] === tokenTypeIndex) {
      lines.add(line);
    }
  }

  return [...lines];
}

async function updateEditor(editor) {
  if (editor.document.languageId !== 'csharp') {
    editor.setDecorations(decoration, []);
    return;
  }

  const document = editor.document;
  const version = document.version;
  const requestVersion = (requestVersions.get(editor) ?? 0) + 1;
  requestVersions.set(editor, requestVersion);
  const fullRange = new vscode.Range(0, 0, document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);

  try {
    const [tokens, legend] = await Promise.all([
      vscode.commands.executeCommand('vscode.provideDocumentSemanticTokens', document.uri),
      vscode.commands.executeCommand('vscode.provideDocumentRangeSemanticTokensLegend', document.uri, fullRange)
    ]);

    if (requestVersions.get(editor) !== requestVersion || editor.document.version !== version) return;

    const ranges = excludedCodeLines(tokens, legend).map(line =>
      new vscode.Range(line, 0, line, document.lineAt(line).text.length)
    );
    editor.setDecorations(decoration, ranges);
  } catch {
    if (requestVersions.get(editor) === requestVersion) editor.setDecorations(decoration, []);
  }
}

function scheduleUpdate(editor) {
  const key = editor.document.uri.toString();
  const pending = pendingRefreshes.get(key);
  if (pending) clearTimeout(pending);

  pendingRefreshes.set(key, setTimeout(() => {
    pendingRefreshes.delete(key);
    void updateEditor(editor);
  }, 120));
}

function refreshVisibleEditors(uri) {
  for (const editor of vscode.window.visibleTextEditors) {
    if (!uri || editor.document.uri.toString() === uri.toString()) {
      scheduleUpdate(editor);
    }
  }
}

function activate(context) {
  void applyScheduledTheme();
  const scheduleTimer = setInterval(() => void applyScheduledTheme(), 15000);

  context.subscriptions.push(
    decoration,
    { dispose: () => clearInterval(scheduleTimer) },
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor) scheduleUpdate(editor);
    }),
    vscode.workspace.onDidChangeTextDocument(event => refreshVisibleEditors(event.document.uri)),
    vscode.workspace.onDidChangeDiagnostics(event => {
      for (const uri of event.uris) refreshVisibleEditors(uri);
    }),
    vscode.workspace.onDidOpenTextDocument(document => refreshVisibleEditors(document.uri)),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(scheduleSettings)) void applyScheduledTheme();
    }),
    {
      dispose: () => {
        for (const timer of pendingRefreshes.values()) clearTimeout(timer);
        pendingRefreshes.clear();
      }
    }
  );

  refreshVisibleEditors();
}

function deactivate() {
  decoration.dispose();
}

module.exports = { activate, deactivate, scheduledTheme };