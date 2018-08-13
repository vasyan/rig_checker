const R = require('ramda')
const request = require('request')
const TelegramBot = require('node-telegram-bot-api')
const { Model: ModelUser } = require('./models/user')
require('./db')

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true })

bot.onText(/\/start/, async (message, match) => {
  const chatId = message.chat.id

  let user = await ModelUser.findById(chatId)

  if (!user) {
    user = new ModelUser({ _id: chatId })
  }

  user.save(err => {
    if (err) {
      throw new Error('Error on account save', err)
    }

    bot.sendMessage(
      chatId,
      'Добро пожаловать. Укажите адресс кошелька для nanopool'
    )
  })
})

bot.onText(/nanopool (0x[a-fA-F0-9]{40}$)/, async (message, match) => {
  await ModelUser.findByIdAndUpdate(message.chat.id, {
    wallet: match[1],
  })

  bot.sendMessage(message.chat.id, 'Адрес обновлен')
})

async function ticker() {
  const users = await ModelUser.find({})

  R.forEach(user => {
    if (user.wallet) {
      request(
        'https://api.nanopool.org/v1/eth/reportedhashrates/' + user.wallet,
        { json: true },
        async (err, res, body) => {
          if (err) {
            return console.log(err)
          }

          ModelUser.findByIdAndUpdate(user._id, {
            lastApiRespoce: JSON.stringify(body)
          })

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

function onWorkerUp(id, worker) {
  ModelUser.findByIdAndUpdate(
    id,
    {
      $pull: { alarms: worker },
    },
    err => {
      if (err) {
        throw new Error('Error on push to alarms')
      }

      bot.sendMessage(id, `Ваш воркер "${worker}" поднялся`)
    }
  )
}

function onWorkerDown(id, worker) {
  ModelUser.findByIdAndUpdate(
    id,
    {
      $push: { alarms: worker },
    },
    err => {
      if (err) {
        throw new Error('Error on pull from alarms')
      }

      bot.sendMessage(id, `Ваш воркер "${worker}" упал.`)
    }
  )
}

bot.onText(/\/check/, () => {
  ticker()
})

setInterval(ticker, 60 * 15 * 1000)

bot.onText(/\/register/, (msg, match) => {})

bot.on('polling_error', error => {})
