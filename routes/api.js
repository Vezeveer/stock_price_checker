/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
var MongoClient = require('mongodb').MongoClient;
const uri = process.env.DB
const client = new MongoClient(uri, { useNewUrlParser: true });
const fetch = require('node-fetch')

//const CONNECTION_STRING = process.env.DB; //MongoClient.connect(CONNECTION_STRING, function(err, db) {});
//refactor code soon
module.exports = function (app) {

  client.connect(err => {
    const collection = client.db("fcc-projects").collection("stockPrices");
    // perform actions on the collection object
    
    app.route('/api/stock-prices')
      .get(function (req, res){
      
        //check if single stock input is correct
        if(typeof req.query.stock == 'string'){
          if(req.query.stock.length < 4){
            res.send('Invalid stock input')
            return;
          }  
        }
      
        let stock = ''
        let stock2 = ''
        let price = 0;
        let price2 = 0;
        let dualStock = false
      
        //check if is an array (dualstock)
        if(req.query.stock[0].length > 1){
          if(req.query.stock[0].length < 4 || req.query.stock[1].length < 4){
            res.send('Invalid stock input')
            return;
          }
          dualStock = true;
          stock = req.query.stock[0].toUpperCase()
          stock2 = req.query.stock[1].toUpperCase();
        } else {
          stock = req.query.stock.toUpperCase()
        }
        //3rd party api call
         fetch('https://www.worldtradingdata.com/api/v1/stock?symbol='+stock+'&api_token='+process.env.API_TOKEN)
          .then(data => {
            return data.json()
        }).then(stockData1 => {
          if(stockData1 == undefined){
            res.send('API limit reached........')
            return;
          }
          if(typeof stockData1.Note == 'string'){
            res.send(stockData1)
            return;
          }
          /*price = stockData1['Global Quote']['05. price']*/
           price = stockData1.data[0].price
          if(req.query.stock.length === 2){
            //if dual stock
            /*
            fetch('https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol='+ stock2 +'&apikey=0T5W95ZS597DT3ZE')
              */
            fetch('https://www.worldtradingdata.com/api/v1/stock?symbol='+stock2+'&api_token='+process.env.API_TOKEN)
              .then(data => {
                return data.json()
            }).then(stockData2 => {
              if(stockData2 == undefined){
                res.send('API limit reached...')
                return;
              }
              /*price2 = stockData2['Global Quote']['05. price']*/
              price = stockData2.data[0].price
              //dual stock db queries
              collection.countDocuments((err, count)=>{ //first check if db is empty
                if(err)console.log(err)
                if(count === 0){
                  collection.insertOne(
                    { stock: stock,
                      price: price,
                      likes: req.query.like ? 1 : 0
                    }, (err, data) => {
                      if(err)console.log('Error inserting one...', err)
                      collection.insertOne(
                        { stock: stock2,
                          price: price2,
                          likes: req.query.like ? 1 : 0
                        }, (err, data2) => {
                          if(err)console.log('Error inserting one...', err)
                          res.send({"stockData":[{"stock":data.ops[0].stock,"price":data.ops[0].price,"rel_likes":data.ops[0].likes},{"stock":data2.ops[0].stock,"price":data2.ops[0].price,"rel_likes":data2.ops[0].likes}]})
                        })
                    }) //end of check if empty, dualstock
                } else {
                  collection.findOne({stock: stock}, (err,data1found) => {
                    if(data1found){ // if stock[0] found, update it
                      collection.updateOne(
                       {stock: stock},
                       {$set: {
                          price: price === 0 ? data1found.price : price,
                          likes: req.query.like ? data1found.likes+1 : data1found.likes}
                       }, (err, data1) => {
                        if(err)console.log('Error updating one...', err)
                         // now check if 2nd stock exists
                        collection.findOne({stock: stock2}, (err,data2found) => {
                         if(data2found){
                           // if stock[1] exists, update it
                            collection.updateOne(
                             {stock: stock2},
                             {$set: {
                                price: price2 === 0 ? data2found.price : price2,
                                likes: req.query.like ? data2found.likes+1 : data2found.likes}
                             }, (err, data2) => {
                              if(err)console.log('Error updating one...', err)
                               res.send({"stockData":[{"stock":data1found.stock,"price":data1found.price,"rel_likes":data1found.likes},{"stock":data2found.stock,"price":data2found.price,"rel_likes":data2found.likes}]})

                            })
                          } else { // if stock[1] doesnt exist, add it
                            collection.insertOne(
                              { stock: stock2,
                                price: price2,
                                likes: req.query.like ? 1 : 0
                              }, (err, data2found) => {
                                if(err)console.log('Error inserting one...', err)
                                res.send({"stockData":[{"stock":data1found.stock,"price":data1found.price,"rel_likes":data1found.likes},{"stock":data2found.ops[0].stock,"price":data2found.ops[0].price,"rel_likes":data2found.ops[0].likes}]})
                                  
                            })
                          }
                          
                        })
                      })
                    } else { // if stock[0] does not exist, add it
                      collection.insertOne(
                        { stock: stock,
                          price: price,
                          likes: req.query.like ? 1 : 0
                        }, (err, data1found) => {
                          if(err)console.log('Error inserting one...', err)
                          // then lookup stock[1]
                         collection.findOne({stock: stock2}, (err,data2find)=>{
                          if(data2find){
                            // if stock[1] exists, update it
                            collection.updateOne(
                             {stock: stock2},
                             {$set: {
                                price: price2 === 0 ? data2find.price : price2,
                                likes: req.query.like ? data2find.likes+1 : data2find.likes}
                             }, (err, data) => {
                              if(err)console.log('Error updating one...', err)
                              collection.findOne({stock: stock2}, (err,data2found) => {
                               res.send({"stockData":[{"stock":data1found.ops[0].stock,"price":data1found.ops[0].price,"rel_likes":data1found.ops[0].likes},{"stock":data2found.stock,"price":data2found.price,"rel_likes":data2found.likes}]})
                        
                              })
                            })
                          }else{
                            // if stock[1] does not exist, add it
                            collection.insertOne(
                              { stock: stock2,
                                price: price2,
                                likes: req.query.like ? 1 : 0
                              }, (err, data2found) => {
                                if(err)console.log('Error inserting one...', err)
                                res.send({"stockData":[{"stock":data1found.stock,"price":data1found.price,"rel_likes":data1found.likes},{"stock":data2found.stock,"price":data2found.price,"rel_likes":data2found.likes}]})
                        
                          })}
                        })
                      })
                    }
                  })
                }
              }) //end of db queries for dual stock
            })
          } else {
            //if single stock
            //single stock db queries. Won't run if dual stock
            collection.countDocuments((err, count)=>{ //first check if db is empty
              if(err)console.log(err)
              if(count === 0){
                collection.insertOne(
                  { stock: stock,
                    price: price,
                    likes: req.query.like ? 1 : 0
                  }, (err, data) => {
                    if(err)console.log('Error inserting one...', err)
                    res.send({"stockData":{"stock":data.ops[0].stock,"price":data.ops[0].price,"likes":data.ops[0].likes}})
                })
              } else {
                collection.findOne({stock: stock}, (err,data) => {
                  if(data){ // update current stock
                    collection.updateOne(
                     {stock: stock},
                     {$set: {
                        price: price === 0 ? data.price : price,
                        likes: req.query.like ? data.likes+1 : data.likes}
                     }, (err, data) => {
                      if(err)console.log('Error updating one...', err)
                      collection.findOne({stock: stock}, (err,data) => {
                        res.send({"stockData":{"stock":data.stock,"price":data.price,"likes":data.likes}})
                      })
                    })
                  } else { // add if new stock
                    collection.insertOne(
                      { stock: stock,
                        price: price,
                        likes: req.query.like ? 1 : 0
                      }, (err, data) => {
                        if(err)console.log('Error inserting one...', err)
                        res.send({"stockData":{"stock":data.ops[0].stock,"price":data.ops[0].price,"likes":data.ops[0].likes}})
                    })
                  }
                })
              }
            }) //end of db queries for single stock
          }
        })
      })//end of get
  });
}