require('dotenv').config()
const express = require('express')
const {google} = require('googleapis')
const cors = require('cors')
const axios = require('axios')
const credentials = require('./credentials')
const helmet = require('helmet')

const PORT = process.env.PORT
const SPREADSHEET_ID = process.env.SPREADSHEET_ID
const CAPTCHA_KEY = process.env.CAPTCHA_KEY

let client
let googleSheet

const app = express()

const auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: "https://www.googleapis.com/auth/spreadsheets"
})

app.use(cors({origin: 'https://technoforge.ru'}))
app.use(helmet())
app.use(express.json())

app.post('/form', async (req, res) => {
    try {
        const {name, phone, telegram, pr_name, pr_link, goal, annotation, expected} = req.body

        if (!req.body.captcha) {
            return res.status(403).json({message: 'Forbidden'})
        }

        const captchaVerified = await axios.get(`https://www.google.com/recaptcha/api/siteverify?secret=${CAPTCHA_KEY}&response=${req.body.captcha}`)

        if (!captchaVerified.data.success || captchaVerified.data.score < 0.4) {
            return res.status(403).json({message: 'Forbidden'})
        }

        await googleSheet.spreadsheets.values.append({
            auth,
            spreadsheetId: SPREADSHEET_ID,
            range: "Data!A:H",
            valueInputOption: "USER_ENTERED",
            resource: {
                values: [[name, phone, telegram, pr_name, pr_link, goal, annotation, expected]],
            }
        })

        return res.status(200).json({status: "Success"})
    } catch (e) {
        return res.status(500).json({status: "Internal server error"})
    }
})

async function initialize () {
    client = await auth.getClient()
    googleSheet = google.sheets({version: 'v4', auth: client})
}

async function start() {
    try {
        await initialize()
        app.listen(PORT, () => console.log('App is working...'))
    } catch (e) {
        console.log(e)
        process.exit(1)
    }
}

start()
