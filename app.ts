'use strict';
const fs = require('fs/promises');
const userInfo = require('os').userInfo;
const join = require('path').join;

interface Config {
  path: string;
  translation: boolean;
  skip: string[];
  dict: { [key: string]: string };
  dictKey: string[];
}

interface DeeplResponse {
  translations: { detected_source_language: string; text: string }[];
}

const messageP: HTMLParagraphElement =
  document.querySelector('#message') ?? document.createElement('p');
const speechresponderDom: HTMLInputElement =
  document.querySelector('#speechresponder') ?? document.createElement('input');
const deeplEnableDom: HTMLInputElement =
  document.querySelector('#deeplEnable') ?? document.createElement('input');
const deeplApiKeyDom: HTMLInputElement =
  document.querySelector('#deeplKey') ?? document.createElement('input');
const speakerDom: HTMLSelectElement =
  document.querySelector('#speaker') ?? document.createElement('select');
const dictKeyDom: HTMLInputElement =
  document.querySelector('#word') ?? document.createElement('input');
const dictReadDom: HTMLInputElement =
  document.querySelector('#read') ?? document.createElement('input');
const dictSubmit: HTMLButtonElement =
  document.querySelector('#dictSubmit') ?? document.createElement('button');
const dictList: HTMLDivElement =
  document.querySelector('#dictList') ?? document.createElement('div');
const configPath = join(
  userInfo().homedir,
  'AppData',
  'Roaming',
  'eddi2voicevox',
  'config.json'
);

const loadConfig = async (): Promise<Config> => {
  try {
    await fs.stat(configPath).catch(async () => {
      const base: Config = JSON.parse(
        await fs.readFile('./config.json', 'utf-8')
      );
      base.path = join(
        userInfo().homedir,
        'AppData',
        'Roaming',
        'EDDI',
        'speechresponder.out'
      ).toString();
      await fs.mkdir(
        join(userInfo().homedir, 'AppData', 'Roaming', 'eddi2voicevox')
      );
      await fs.writeFile(configPath, JSON.stringify(base));
      messageP.innerText = `config.jsonを${configPath}に作成しました`;
    });
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    config.dictKey = Object.keys(config.dict);
    speechresponderDom.value = config.path;
    return config;
  } catch (e) {
    return { path: '', translation: false, skip: [], dict: {}, dictKey: [] };
  }
};

const getAudioBlob = async (txt: string, speaker: number): Promise<Blob> => {
  try {
    let uri: URL = new URL(
      `http://localhost:50021/audio_query?text=${txt}&speaker=${speaker}`
    );
    const queryRes: Response = await fetch(uri.toString(), {
      method: 'POST',
      headers: {
        accept: 'application/json',
      },
    });
    if (queryRes.ok === false)
      throw new Error(
        `code: ${queryRes.status} message: ${queryRes.statusText}`
      );
    const jsonQuery = await queryRes.json();
    jsonQuery.speedScale = 1.2;
    uri = new URL(`http://localhost:50021/synthesis?speaker=${speaker}`);
    const audioRes = await fetch(uri.toString(), {
      method: 'POST',
      headers: {
        accept: 'audio/wav',
        'content-type': 'application/json',
      },
      body: JSON.stringify(jsonQuery),
    });
    if (audioRes.ok === false)
      throw new Error(
        `code: ${audioRes.status} message: ${audioRes.statusText}`
      );
    const blob = await audioRes.blob();
    return blob;
  } catch (e) {
    throw new Error(e);
  }
};

const deeplTranslate = async (txt: string, key: string): Promise<string> => {
  const f: Response = await fetch(
    new URL('https://api-free.deepl.com/v2/translate').toString(),
    {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: `auth_key=${key}&text=${txt}&source_lang=EN&target_lang=JA`,
    }
  );
  if (f.ok === false)
    throw new Error(`code: ${f.status} message: ${f.statusText}`);
  const json: DeeplResponse = await f.json();
  let res = '';
  json.translations.forEach((t) => {
    res += t.text;
  });
  return res;
};

const getLastModified = async (
  str: string,
  config: Config
): Promise<string> => {
  config.skip.forEach((e: string) => {
    str = str.replaceAll(e, '');
  });
  config.dictKey.forEach((key: string) => {
    const reg = new RegExp('\\b' + key + '\\b');
    str = str.replace(reg, config.dict[key]);
  });
  if (config.translation === true && str.match(/\*\/\//) === null) {
    if (deeplEnableDom.checked && deeplApiKeyDom.value !== '') {
      try {
        str = await deeplTranslate(str, deeplApiKeyDom.value);
      } catch (e) {
        const f = await fetch(
          new URL(
            `https://script.google.com/macros/s/AKfycbxgx1pJwLnAgpBP-bBjHO2G18oBhPJbrg9CyWBS1dc9HyfMgj0/exec?text=${str}`
          ).toString()
        );
        const j = await f.json();
        if (j.code === 200) {
          str = j.text;
        }
      }
    } else {
      const f = await fetch(
        new URL(
          `https://script.google.com/macros/s/AKfycbxgx1pJwLnAgpBP-bBjHO2G18oBhPJbrg9CyWBS1dc9HyfMgj0/exec?text=${str}`
        ).toString()
      );
      const j = await f.json();
      if (j.code === 200) {
        str = j.text;
      }
    }
  }
  str = str.replace(/\*\/\//g, '');
  str = str.replace(/[a-zA-Z]\)/g, '');
  str.match(/[亜-熙ぁ-んァ-ヶ]\ /g)?.forEach((reg) => {
    str = str.replace(reg, reg.replace(/ /g, ''));
  });
  return str;
};

const play = (src: Blob): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const uri = URL.createObjectURL(src);
      const audio = new Audio(uri);
      audio.addEventListener('ended', () => {
        resolve();
        URL.revokeObjectURL(uri);
      });
      audio.play();
    } catch (e) {
      reject(e);
    }
  });
};

const getSpeaker = (): number => parseInt(speakerDom.value);

const main = async () => {
  const config = await loadConfig();
  const updateLocalConfig = async () => {
    const c = JSON.parse(JSON.stringify(config));
    delete c.dictKey;
    await fs.writeFile(configPath, JSON.stringify(c));
  };

  if (speechresponderDom.value !== '') config.path = speechresponderDom.value;
  speechresponderDom.addEventListener('change', async () => {
    const newPath = speechresponderDom.value;
    config.path = newPath;
    await updateLocalConfig();
    location.reload();
  });

  config.dictKey.forEach((key: string): void => {
    const p = document.createElement('p');
    p.innerText = `${key} => ${config.dict[key]}`;
    const span = document.createElement('span');
    span.innerText = 'X';
    p.appendChild(span);
    span.addEventListener('click', async () => {
      dictList.removeChild(p);
      delete config.dict[key];
      config.dictKey = config.dictKey.filter((v) => v !== key);
      await updateLocalConfig();
    });
    dictList.appendChild(p);
  });

  dictSubmit.addEventListener('click', async (): Promise<void> => {
    const [key, read] = [dictKeyDom.value, dictReadDom.value];
    config.dict[key] = read;
    config.dictKey.push(key);
    await updateLocalConfig();
    [dictKeyDom.value, dictReadDom.value] = ['', ''];

    const p = document.createElement('p');
    p.innerText = `${key} => ${read}`;
    const span = document.createElement('span');
    span.innerText = 'X';
    p.appendChild(span);
    span.addEventListener('click', async () => {
      dictList.removeChild(p);
      delete config.dict[key];
      config.dictKey = config.dictKey.filter((v) => v !== key);
      await updateLocalConfig();
    });
    dictList.appendChild(p);
  });

  if (localStorage.getItem('deeplEnable') !== null) {
    deeplEnableDom.click();
    deeplApiKeyDom.removeAttribute('disabled');
  }

  if (localStorage.getItem('deeplApiKey') !== null) {
    deeplApiKeyDom.value = localStorage.getItem('deeplApiKey') ?? '';
  }

  deeplEnableDom.addEventListener('change', () => {
    if (deeplEnableDom.checked) {
      deeplApiKeyDom.removeAttribute('disabled');
      localStorage.setItem('deeplEnable', 'true');
    } else {
      deeplApiKeyDom.setAttribute('disabled', '');
      localStorage.removeItem('deeplEnable');
    }
  });

  deeplApiKeyDom.addEventListener('change', () => {
    localStorage.setItem('deeplApiKey', deeplApiKeyDom.value);
  });

  let timeout: boolean = true;
  const watcher: AsyncIterable<any> = fs.watch(config.path);
  for await (const event of watcher) {
    if (event.eventType !== 'change' && timeout === false) continue;
    timeout = false;
    setTimeout(() => (timeout = true), 100);
    try {
      const responder = await fs.readFile(config.path, 'utf-8');
      const lastModified = await getLastModified(
        responder.split('\n')[responder.split('\n').length - 2],
        config
      );
      const splitted = lastModified.split('。');
      messageP.innerText = '';
      for (let i = 0; i < splitted.length; i++) {
        messageP.innerText += splitted[i];
        const blob = await getAudioBlob(splitted[i], getSpeaker());
        await play(blob);
      }
    } catch (e) {
      messageP.innerText = e;
    }
  }
};

main();
