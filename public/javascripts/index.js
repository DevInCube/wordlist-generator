const model = {
    filename: null,
    inText: null,
}

let editor = ace.edit("editor");
editor.setTheme("ace/theme/chrome");
editor.session.setMode("ace/mode/xml");
editor.resize();

document.getElementById('upload').addEventListener('change', handleFileSelect, false);
document.getElementById('save').addEventListener('click', onSaveResourcePack, false);

document.getElementById('trackNo').addEventListener('change', handleSettingsChange, false);
document.getElementById('fromOffset').addEventListener('change', handleSettingsChange, false);
document.getElementById('toOffset').addEventListener('change', handleSettingsChange, false);

function handleFileSelect(evt) {
    let files = evt.target.files; // FileList object

    // use the 1st file from the list
    f = files[0];

    let reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = (function (theFile) {
        return function (e) {
            const inText = e.target.result;
            model.inText = inText;
            model.filename = theFile.name;
            handleSettingsChange();
        };
    })(f);

    reader.readAsBinaryString(f)
}

function handleSettingsChange()
{
    const inText = model.inText;
    if (!inText) {
        return;
    }

    const trackNo = +document.getElementById('trackNo').value;
    const fromOffset = +document.getElementById('fromOffset').value;
    const toOffset = +document.getElementById('toOffset').value;
    const outText = processFile(inText, trackNo, fromOffset, toOffset);
    editor.setValue(outText);
}

function onSaveResourcePack(event) {
    try {
        let text = editor.getValue();
        if (!text) 
            throw new Error(`Пусто`);
        download(text, model.filename + '.xml', "blob");
    } catch (err) {
        alert(`Помилка створення ресурспаку: ${err}`)
    }
}

// Function to download data to a file
function download(data, filename, type) {
    let file = new Blob([data], { type: type });
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        let a = document.createElement("a");
        let url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
}


//=================
function createDescriptor(text, trackNo, from, to)
{
    return `  <WordDescriptor>
    <WordText>${text}</WordText>
    <StartTrackNo>${trackNo}</StartTrackNo>
    <StartOffset>${from}</StartOffset>
    <EndTrackNo>${trackNo}</EndTrackNo>
    <EndOffset>${to}</EndOffset>
  </WordDescriptor>`
}

function round(num)
{
    return Math.round((num + Number.EPSILON) * 100) / 100;
}

function processFile(inText, trackNo, fromOffset, toOffset)
{
    const outText = inText
        .split(`\r\n`)
        .filter(i => i.trim().length > 0)
        .map(i => i.split(`\t`))
        .map((val, ind) => createDescriptor(`Word#${ind}`, trackNo, Math.max(0, round(+val[0] + fromOffset)), round(+val[1] + toOffset)))
        .join(`\r\n`);
    const wordList = `<WordList>
${outText}
</WordList>`;

    return wordList;
}