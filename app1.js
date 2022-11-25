const express = require('express')
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient;
const router = express.Router();
const app = express()
const url = require('./secret.js');
// const { ObjectId } = require('bson');
const ObjectId = require('mongodb').ObjectId
const redis = require('redis');

app.use(bodyParser.json())

const client = new MongoClient(url,{
    useNewUrlParser : true,
    useUnifiedTopology: true
})


let redisClient;

(async () => {
  redisClient = redis.createClient();

  redisClient.on("error", (error) => console.error(`Error : ${error}`));

  await redisClient.connect();
})();


async function cacheData(req, res, next) {
    console.log("===cached")
    const species = req.params.name;
    let results;
    try {
      const cacheResults = await redisClient.get(species);
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
            console.log("inside else")
            myDB.find(req.params).toArray()
            .then(async(r)=>{
                console.log(r)
                results = r

                console.log(results)

                res.contentType('application/json')
                res.send(JSON.stringify(r))

        
                await redisClient.set(name,JSON.stringify(results));
            })
        // }

        
    })


    app.post('/',(req,res)=>{

            myDB.insertOne(req.body)
            .then(results=>{
                console.log(results)
                res.contentType('application/json')
                res.send(JSON.stringify(results))
            })
    })

    app.post('/dailySpends',(req,res)=>{

        myDB.find(ObjectId(req.body.userId)).toArray()
        .then(results=>{

            console.log(results)
            console.log(results.length)

            if(results.length>0){
                myDB1.insertOne(req.body)
                .then(res1 =>{
                    console.log(res1)
                res.contentType('application/json')
                res.send(res1)
            })
            }else{
                res.send("User not found")
            }
           
    }).catch(err=>{
        console.log("user not found")
    })
        })
        

    app.get('/dailySpends/:userId',async(req,res)=>{

        
            // let results = await myDB1.find({
            //     userId:req,params,
            //     {createdAt:{$gte:ISODate("2021-01-01"),$lt:ISODate("2020-05-01"}}
            // }).toArray()

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

            console.log(req.params.userId)
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

            // let results = await myDB1.aggregate([
            //     { 
            //         $match:{
            //             $and:[
            //                 {
            //                     "userId" : req.params.userId,
            //                 },
            //                 // {

            //                 // }
            //             ]
            //         }
            //     }]
            //   );
              

            const page = parseInt(req.query.page);
            const limit = parseInt(req.query.limit);
         
            const startIndex = (page - 1) * limit;
            const endIndex = page * limit;

            const paginationResults = {};

            console.log(results.length)
            console.log(results)
         
            console.log(startIndex,endIndex)
            // results = results.slice(startIndex, endIndex);

                res.send(results)
        })

    })
// MongoClient.connect(url,(err,db)=>{
//     if (err) throw err;
//     console.log('connected')
//     // db.close()
// })


app.listen(8000,()=>{
    console.log('server is ready')
})