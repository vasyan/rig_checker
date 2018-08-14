const R = require('ramda')
const request = require('request')
const Telegraf = require('telegraf')
const Telegram = require('telegraf/telegram')
const { Model: ModelUser } = require('./models/user')
require('./db')

const API_URI = process.env.NODE_ENV === 'prod'
  ? "https://api.nanopool.org/v1/eth/reportedhashrates/"
  : "http://localhost:3000/";

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)
const telegram = new Telegram(process.env.TELEGRAM_BOT_TOKEN)


const makeRequest = (uri, callback) => request(
  uri,
  { json: true },
  callback
)

bot.start(async ctx => {
  const chatId = ctx.chat.id

  let user = await ModelUser.findById(chatId)

  if (!user) {
    user = new ModelUser({ _id: chatId })
  }


  user.save(err => {
    if (err) {
      throw new Error('Error on account save', err)
    }

    ctx.reply('Wellcome. Setup your nanopool wallet.')
  })
})

bot.hears(/(0x[a-fA-F0-9]{40}$)/, async ctx => {
  await ModelUser.findByIdAndUpdate(ctx.chat.id, {
    wallet: ctx.match[1],
  })

  ctx.reply('Address has been updated')
})

bot.command('status', async ctx => {
  const user = await ModelUser.findById(ctx.chat.id)

  if (user.alarms.length) {
    ctx.reply(`Workers on down - ${user.alarms.join(', ')}`)
    return
  }

  ctx.reply('💁‍♀️ Workers are cool 💁‍♀️')
})

bot.command('debug', async ctx => {
  const user = await ModelUser.findById(ctx.chat.id)

  makeRequest(
    API_URI + user.wallet,
    async (err, res, body) => {
      if (err) {
        ctx.reply(`Error on API call ${err}`)
        return
      }

      ctx.reply(`API response = ${JSON.stringify(body)}`)
    }
  )
})

async function ticker() {
  const users = await ModelUser.find({})

  R.forEach(user => {
    if (user.wallet) {
      makeRequest(
        API_URI + user.wallet,
        async (err, res, body) => {
          if (err) {
            return console.log(err)
          }

          R.forEach(({ worker, hashrate }) => {
            if (hashrate === 0 && user.alarms.indexOf(worker) === -1) {
              onWorkerDown(user._id, worker)
            } else if (hashrate > 0 && user.alarms.indexOf(worker) > -1) {
              onWorkerUp(user._id, worker)
            }
          }, body.data)
        }
      )
    }
  }, users)
}

function onWorkerUp(chatId, worker) {
  ModelUser.findByIdAndUpdate(
    chatId,
    {
      $pull: { alarms: worker },
    },
    err => {
      if (err) {
        throw new Error('Error on push to alarms')
      }

      telegram.sendMessage(chatId, `⬆️ Worker "${worker}" up ⬆️`)
    }
  )
}

function onWorkerDown(chatId, worker) {
  ModelUser.findByIdAndUpdate(
    chatId,
    {
      $push: { alarms: worker },
    },
    err => {
      if (err) {
        throw new Error('Error on pull from alarms')
      }

      telegram.sendMessage(chatId, `⬇️ Worker "${worker}" down ⬇️`)
    }
  )
}

bot.command('check', ticker)

bot.startPolling()

bot.catch(err => {
  console.log('Ooops', err)
})

console.log('it\'s alive!')

async function pong() {
  const users = await ModelUser.find({})

  R.forEach(user => {
    telegram.getChat(user._id).then(() => {
      telegram.sendMessage(user._id, "🙈 Whoops, I'm dizzy after reboot 🙈")
    }).catch(err => { console.warn('--- Pong processing --- Sorry, chat not found', user._id)})
  }, users)
}

ticker()

setInterval(ticker, 60 * 15 * 1000)

// pong()