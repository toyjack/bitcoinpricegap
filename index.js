require('date-utils')
let axios = require('axios')
let dotenv = require('dotenv')
dotenv.load()
let sg = require('sendgrid')(process.env.SENDGRID_API_KEY)
let helper = require('sendgrid').mail;


const from = process.env.SEND_FROM
const tos = process.env.SEND_TO.split(',')
const huobiAPI = 'https://api.btctrade.com/api/ticker?coin=btc'
const bitflyerAPI = 'https://bitflyer.jp/api/echo/price'

function sendMail(to,contentBody) {
    let fromEmail = new helper.Email(from);
    let toEmail = new helper.Email(to);
    let subject = '差价';
    let content = new helper.Content('text/plain', contentBody);
    let mail = new helper.Mail(fromEmail, subject, toEmail, content);
    let request = sg.emptyRequest({
        method: 'POST',
        path: '/v3/mail/send',
        body: mail.toJSON()
    });

    sg.API(request, function (error, response) {
        if (error) {
            console.log('Error response received');
        }
        console.log(response.statusCode);
        console.log(response.body);
        console.log(response.headers);
    });
}

function getHuobi() {
    return axios.get(huobiAPI)
}

function getBitflyer() {
    return axios.get(bitflyerAPI)
}

function getRate() {
    return axios.get('http://api.k780.com/?app=finance.rate_cnyquot&curno=JPY&&appkey=10003&sign=b59bc3ef6191eb9f747dd4e83c99f2a4&format=json')
}

axios.all([getHuobi(), getBitflyer(), getRate()])
    .then(axios.spread(function (huobi, bitflyer, rate) {
        let curHuobi = huobi.data.sell
        let curRate = parseFloat(rate.data.result.JPY.BOC.se_sell)
        let curBitflyer = parseInt(bitflyer.data.ask / 100 * curRate)
        let curPriceGap = curHuobi - curBitflyer
        let dt = new Date()
        let curTime = dt.toFormat('YYYY/MM/DD HH24:MI:SS')
        let message = curTime + ' 火币：' + curHuobi + '元，Bitflyer：' + curBitflyer + '元，汇率（中行现汇卖出）：' + curRate + '，差价（中-日）：' + curPriceGap + '。'
        console.log(message)
        tos.forEach(function(to){
            sendMail(to,message)
        })
    }))
    .catch(function(error){
        sendMail(to,error)
    })