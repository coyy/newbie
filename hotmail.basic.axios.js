const fs = require('fs');
const path = require('path');
const CookieFileStore = require('tough-cookie-file-store').FileCookieStore;
const HttpCookieAgent = require('http-cookie-agent/http').HttpCookieAgent;
const HttpsCookieAgent = require('http-cookie-agent/http').HttpsCookieAgent;
const { CookieJar } = require('tough-cookie');
const axios = require('axios');
const Chance = require('chance');
const chance = new Chance();

const httpBuildQuery = object => {
  const params = new URLSearchParams(object);
  return params.toString();
};

const fetchValue = (str, find_start, find_end) => {
  try {
    var start = str.indexOf(find_start);
    if (start == -1) {
      return '';
    }
    var length = find_start.length;
    var strNew = str.substring(start + length);
    var indexEnd = strNew.indexOf(find_end);
    return strNew.substring(0, indexEnd).trim();
  } catch (err) {
    return '';
  }
};

const isNullOrEmpty = string => {
  if (string && string.length > 0) {
    return false;
  }
  return true;
};

const inputValue = (str, value) => {
  try {
    if (str.length == 0) {
      return '';
    }
    var match = new RegExp(' value="([^"]+)?" name="' + value + '"');
    if (!match.test(str)) match = new RegExp(' name="' + value + '" value="([^"]+)"');
    if (!match.test(str)) match = new RegExp(' name="' + value + '"((?!value=").)+value="([^"]+)"');
    if (!match.test(str)) match = new RegExp(' value="([^"]+)?"((?!name=").)+name="' + value + '"');
    if (match.test(str)) {
      let matchResult = str.match(match);
      if (matchResult) return matchResult.length > 1 ? matchResult[2] : matchResult[1];
    }
    var start = str.indexOf('"' + value + '"');
    var startValue = str.indexOf('value="');
    if (start < 0 || startValue < 0) return '';
    var result = null;
    while (start > 0) {
      var cfParam = str.substring(start);
      startValue = cfParam.indexOf('value="');
      if (startValue >= 0) {
        cfParam = cfParam.substring(cfParam.indexOf('value="') + 'value="'.length);
        result = cfParam.substring(0, cfParam.indexOf('"'));
        break;
      } else {
        start = start - 1;
      }
    }
    return result;
  } catch (err) {
    return '';
  }
};

async function hotmail(email, pass) {
  const cookieStorage = path.join(btoa(email) + '.json');
  if (!fs.existsSync(cookieStorage)) fs.writeFileSync(cookieStorage, '');
  const cookieJar = new CookieJar(new CookieFileStore(cookieStorage));
  const fetch = axios.create({
    httpAgent: new HttpCookieAgent({ cookies: { jar: cookieJar } }),
    httpsAgent: new HttpsCookieAgent({ cookies: { jar: cookieJar } }),
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    },
  });

  var response = await fetch.get('https://outlook.live.com/owa/?nlp=1', {
    maxRedirects: 2,
    validateStatus: status => status >= 200 && status < 400,
  });

  if (response.request.res.responseUrl.match(/login.srf/)) {
    var sUnauthSessionID = fetchValue(response.data, "sUnauthSessionID:'", "'");
    var PPFT = inputValue(response.data, 'PPFT');
    var urlPost = fetchValue(response.data, "urlPost:'", "'");
    var urlCheckAcc = fetchValue(response.data, "urlGetCredentialType:'", "'");

    response = await fetch.post(urlCheckAcc, {
      checkPhones: true,
      country: '',
      federationFlags: 3,
      flowToken: PPFT,
      forceotclogin: false,
      isCookieBannerShown: false,
      isExternalFederationDisallowed: false,
      isFederationDisabled: false,
      isFidoSupported: true,
      isOtherIdpSupported: true,
      isRemoteConnectSupported: false,
      isRemoteNGCSupported: true,
      isSignup: false,
      originalRequest: '',
      otclogindisallowed: false,
      uaid: sUnauthSessionID,
      username: email,
    });
    if (!(response.data.IfExistsResult == 0 || response.data.IfExistsResult == 2)) {
      console.log('Email not exists');
      return null;
    }

    response = await fetch.post(
      urlPost,
      httpBuildQuery({
        ps: '2',
        psRNGCDefaultType: '',
        psRNGCEntropy: '',
        psRNGCSLK: '',
        canary: '',
        ctx: '',
        hpgrequestid: '',
        PPFT: PPFT,
        PPSX: 'Pass',
        NewUser: '1',
        FoundMSAs: '',
        fspost: '0',
        i21: '0',
        CookieDisclosure: '0',
        IsFidoSupported: '1',
        isSignupPost: '0',
        isRecoveryAttemptPost: '0',
        i13: '0',
        login: email,
        loginfmt: email,
        type: '11',
        LoginOptions: '3',
        lrt: '',
        lrtPartition: '',
        hisRegion: '',
        hisScaleUnit: '',
        passwd: pass,
      }),
    );
    var sFT = fetchValue(response.data, "sFT:'", "'");
    var urlPost = fetchValue(response.data, "urlPost:'", "'");
    var loginSuccess = fetchValue(response.data, "sSigninName:'", "'");
    var loginWrongPassword = fetchValue(response.data, "urlResetPassword:'", "'");

    if (response.data.match(/target="_top"/)) {
      console.log('Email Verification');
      return null;
    }
    if (isNullOrEmpty(loginSuccess) && !isNullOrEmpty(loginWrongPassword)) {
      console.log('Email Die');
      return null;
    }
    if (isNullOrEmpty(loginSuccess) || isNullOrEmpty(urlPost)) {
      console.log('Error Unknown');
      return null;
    }

    response = await fetch.post(
      urlPost,
      httpBuildQuery({
        LoginOptions: '1',
        type: '28',
        ctx: '',
        hpgrequestid: '',
        PPFT: sFT,
        canary: '',
        DontShowAgain: 'true',
      }),
    );

    var urlPost = fetchValue(response.data, 'action="', '"');
    response = await fetch.post(
      urlPost,
      httpBuildQuery({
        NAPExp: inputValue(response.data, 'NAPExp'),
        wbids: inputValue(response.data, 'wbids'),
        pprid: inputValue(response.data, 'pprid'),
        wbid: inputValue(response.data, 'wbid'),
        NAP: inputValue(response.data, 'NAP'),
        ANON: inputValue(response.data, 'ANON'),
        ANONExp: inputValue(response.data, 'ANONExp'),
        t: inputValue(response.data, 't'),
      }),
      {
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400,
      },
    );

    response = await fetch.get('https://outlook.live.com/owa/?nlp=1', {
      maxRedirects: 2,
      validateStatus: status => status >= 200 && status < 400,
    });
  }

  if (response.request.res.responseUrl.match(/outlook.live.com\/(owa|mail)\//)) {
    var CANARY = fetchValue(response.request._headers.cookie, 'X-OWA-CANARY=', ';');
    return {
      fetch,
      CANARY,
    };
  } else {
    console.log('Error Unknown');
    return null;
  }
}

const ReadCodeFacebook = async (fetch, CANARY) => {
  var response = await fetch.post(
    'https://outlook.live.com/owa/0/service.svc?action=GetAccessTokenforResource',
    '',
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': '0',
        'X-Owa-Canary': CANARY,
        'X-Owa-Urlpostdata':
          '%7B%22__type%22%3A%22TokenRequest%3A%23Exchange%22%2C%22Resource%22%3A%22https%3A%2F%2Foutlook.live.com%22%7D',
        Action: 'GetAccessTokenforResource',
      },
    },
  );

  var acccess_token = response.data.AccessToken;
  if (!isNullOrEmpty(acccess_token)) {
    response = await fetch.post(
      'https://outlook.live.com/search/api/v2/query',
      {
        Cvid: chance.guid({ version: 4 }),
        Scenario: { Name: 'owa.react' },
        TimeZone: 'SE Asia Standard Time',
        TextDecorations: 'Off',
        EntityRequests: [
          {
            EntityType: 'Conversation',
            ContentSources: ['Exchange'],
            From: 0,
            Query: { QueryString: 'from:security@facebookmail.com' },
            Size: 25,
            Sort: [{ Field: 'Time', SortDirection: 'Desc' }],
            EnableTopResults: false,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${acccess_token}`,
        },
      },
    );

    try {
      var listResult = response.data.EntitySets[0].ResultSets[0].Results;
      for (let i = 0; i < listResult.length; i++) {
        let match = listResult[i].HitHighlightedSummary.toString().match(/\r\n\r\n(\d{8})\r\n\r\n/);
        if (match) {
          return match[1];
        }
      }
    } catch {}
  }
  return null;
};

async function main() {
  var login = await hotmail('millnerazy569686@hotmail.com', 'tWZxfO756');
  if (login) {
    var code = await ReadCodeFacebook(login.fetch, login.CANARY);
    console.log(code);
  }
}

main();
