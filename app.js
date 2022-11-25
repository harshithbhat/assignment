const express = require('express')
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient;
const router = express.Router();
const app = express()
const url = require('./secret.js');
const ObjectId = require('mongodb').ObjectId
const redis = require('redis');
// const multer = require('multer')


app.use(bodyParser.json())



// const multerStorage = multer.diskStorage({
//     destination: (req, file, cb) => {
//       cb(null, "public");
//     },
//     filename: (req, file, cb) => {
//       const ext = file.mimetype.split("/")[1];
//       cb(null, `files/admin-${file.fieldname}-${Date.now()}.${ext}`);
//     },
//   });

  // Multer Filter
// const multerFilter = (req, file, cb) => {

//     console.log(file.mimetype.split("/")[1])
//     if (file.mimetype.split("/")[1] === "png") {
//       cb(null, true);
//     } else {
//       cb(new Error("Not a PDF File!!"), false);
//     }
//   };


//   const upload = multer({
//     storage: multerStorage,
//     fileFilter: multerFilter,
//   });

// app.post('/upladFile',upload.single("myfile"),(req,res)=>{
//   console.log(res)
// })


const client = new MongoClient(url,{
    useNewUrlParser : true,
    useUnifiedTopology: true
})





let redisClient;

( async() => {
  redisClient = redis.createClient();

  redisClient.on("error", (error) => console.error(`Error : ${error}`));

   await redisClient.connect();
})();


async function cacheData(req, res, next) {
    console.log("===cached")
    const name = req.params.name;
    let results;
    try {
      const cacheResults = await redisClient.get(name);
      if (cacheResults) {
        results = JSON.parse(cacheResults);
        res.send({
          fromCache: true,
          data: results,
        });
      } 
      else {
        next();
      }
    } catch (error) {
      console.error(error);
      res.status(404);
    }
  }
  

client.connect(err => {

    const myDB = client.db('assignments').collection('user')
    const myDB1 = client.db('assignments').collection('dailySpends')

    app.get('/users/:name',cacheData,async(req,res)=>{


        console.log("inside route/")
//         const name = req.params.name;
//   let results;
//   let isCached = false;

//         const cacheResults = await redisClient.get(name);

//         console.log("cacheResults")
//         console.log(cacheResults)
//         if (cacheResults) {
//             console.log("==="+(cacheResults))
//           isCached = true;
//           results = JSON.parse(cacheResults);


//           res.contentType('application/json')
//           res.send(JSON.stringify(results))

//         }

        // else{
            // console.log("inside else")
            myDB.find(req.params).toArray()
            .then(async(r)=>{
                // console.log(r)
                results = r

                // console.log(results)

                res.contentType('application/json')
                res.status(200).json(JSON.stringify(r))

        
                await redisClient.set(name,JSON.stringify(results));
            })
        // }

        
    })


    app.post('/addUser',(req,res)=>{

            myDB.insertOne(req.body)
            .then(results=>{
                // console.log(results)
                res.contentType('application/json')
                // res.status(200)
                res.status(200).json(results);

                // res.send(200)
            })
    })

    app.post('/dailySpends',(req,res)=>{

        myDB.find(ObjectId(req.body.userId)).toArray()
        .then(results=>{

            // console.log(results)
            // console.log(results.length)

            if(results.length>0){
                myDB1.insertOne(req.body)
                .then(res1 =>{
                    // console.log(res1)
                res.contentType('application/json')
                res.status(200).json(res1)
            })
            }else{
                res.status(200).json("User not found")
            }
           
    }).catch(err=>{
        console.log("user not found")
    })
        })
        

    app.get('/dailySpends/:userId',async(req,res)=>{

        

            let startDate = 0
            let endDate = 0
            if(req.body.startDate && req.body.endDate){
                startDate = req.body.startDate
                endDate = req.body.endDate
            }

            let startAmount = 0 
            let endAmount = 0

            if(req.body.startAmount && req.body.endAmount){
                startAmount = req.body.startAmount
                endAmount = req.body.endAmount
            }

            // console.log(req.params.userId)
            let results = await myDB1.find({
                $and:[
                {"userId" : req.params.userId},
                {
                    $or:[
                {"date" : {$gte:startDate,$lt:endDate}},
                {
                    "amount":{$gte:startAmount,$lte:endAmount}
                }

                ]
            }
            ]
            }).toArray()
              

            const page = parseInt(req.query.page);
            const limit = parseInt(req.query.limit);
         
            const startIndex = (page - 1) * limit;
            const endIndex = page * limit;

            const paginationResults = {};

            // console.log(results.length)
            // console.log(results)
         
            // console.log(startIndex,endIndex)
            // results = results.slice(startIndex, endIndex);

                res.status(200).json(results)
        })

    })


module.exports = app.listen(8000,()=>{
    console.log('server is ready')
})

