import express from 'express'
import cors from 'cors'
import 'dotenv/config'


const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(express.json())
app.use(cors())

// Home API
app.get('/', (req, res) => {
    res.send('RentZone website is running fine!')
})

app.listen(PORT, () => {
    console.log(`RentZone app listening on port ${PORT}`)
})