const express = require('express');
const { advertise } = require("../models/advertises");
const { Category } = require("../models/categories");
const { subdivisions } = require("../models/subdivisions")
const { advertise_detail } = require('../models/ads_detail')
const multer = require("multer");
const upload = multer({ dest: '/uploads/' }).array('files', 2)
require('dotenv').config();
const fs = require("fs");
const axios = require('axios');
const { Console } = require('console');
const { cities } = require("../models/cities")
const { views } = require("../models/views");
const { response } = require('express');
const { Client } = require("@googlemaps/google-maps-services-js");
const app = express();


//google map

// const geocoderQuery = encodeURIComponent(`gulshan karachi`.replace(/ /g, '+'))
// return axios.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${geocoderQuery}&key=${process.env.google_key}`)
//     .then(res => res.data)
//     .then(json => {
//         if (json.results.length === 0) {
//             return null
//         }
//         let lat = json.results['0'].geometry.location.lat
//         let lng = json.results['0'].geometry.location.lng
//         return { lat, lng }
//     })
const google_map = async(req, res) => {
    return new Promise((resolve, reject) => {
        //const data = JSON.parse(fs.readFileSync("csvjson.json"));
        //console.log(`Getting address for ${lat}, ${lng}...`);
        axios.get(`https: //maps.googleapis.com/maps/api/geocode/json?latlng=40.714224,-73.961452&key="AIzaSyCqQHPCt5EYtHklVMR8sC0CkzWMCnPdSUA"`)
            .then(response => {
                console.log(response.data)
                return resolve(response.data)
            })
            .catch(error => {
                console.log(error.message)
                return reject(error.message)
            })
    })
}




//console.log('the results: '+ results)

//https: //maps.googleapis.com/maps/api/geocode/json?latlng=40.714224,-73.961452&key="AIzaSyCqQHPCt5EYtHklVMR8sC0CkzWMCnPdSUA"

//get ads acc to category
const get_sub_ads = async(req, res) => {
    try {
        const { cat_id } = req.query
        const data_find = await Category.find({ parent_Id: cat_id }, "_id")
        if (data_find.length != 0) {
            let lst_data = []
            for (var abc of data_find) {
                lst_data.push(abc)
            }
            const data_final = await advertise.find({ category_id: { $in: lst_data } })
            console.log(lst_data)
            let helperfunction = () => {
                let response = res.statusCode;
                let message = "This is All Advertise Of This Category"
                let status1 = true;
                res.status(200).send({ response: response, status: status1, message: message, data: data_final })
            }
            helperfunction()
        } else {
            const data_final = await advertise.find({ category_id: cat_id })
            console.log(data_final)
            let helperfunction = () => {
                let response = res.statusCode;
                let message = "This is All Advertise Of This Category"
                let status1 = true;
                res.status(200).send({ response: response, status: status1, message: message, data: data_final })
            }
            helperfunction()
        }
    } catch (e) {
        console.log(e)
        res.send("Some Error Is Occured")
    }
}

const search_api = async(req, res) => {
    try {
        var { main_search, city1, g_price1, l_price1, subdivision_id1, category1, page, size } = req.query;
        if (!page) {
            page = 1
        }
        if (!size) {
            size = 2
        }

        const limit = parseInt(size)
        const skip = (page - 1) * size;

        //max price
        const greater_price = await advertise.aggregate([{
            $group: {
                _id: null,
                maxprice: { $max: "$price" }
            }
        }])

        //city
        const citloc = await advertise.find({}, "city")
        let citylst1 = []
        for (var v in citloc) {
            const loc1 = await advertise.find({ city: citloc[v].city }, "location")
            citylst1.push({ city: citloc[v].city, location: loc1 })
        }

        //city final
        const city11 = await advertise.find({}, "city_id")
        let citylst2 = []
        for (var m in city11) {
            const cityname = await cities.find({ _id: city11[m].city_id }, "name")
            const subdivname = await subdivisions.find({ city_id: city11[m].city_id }, "Subdivison_name")
            citylst2.push({
                [cityname]: subdivname
            })
        }


        let a = greater_price[0].maxprice
        let gpr = a.toString()

        //subdivision
        var sublst = [];
        if (!subdivision_id1) {
            const subdata = await advertise.find({}, "subdivision_id")
            for (var abcd in subdata) {
                sublst.push(subdata[abcd].subdivision_id)
            }
        }
        if (subdivision_id1) {
            sublst.push(subdivision_id1)
        }

        //Category
        datacat = []
        lstdata = []
        subcat_count = []
        if (category1) {
            const main_cat = await Category.find({ parent_Id: category1 })
            for (var xyz in main_cat) {
                lstdata.push(main_cat[xyz]._id)
            }
            const main_cat1 = await Category.find({ _id: category1 })
            const sub_cat1 = await Category.find({ parent_Id: category1 })
            let obj1 = {}
            obj1.name = main_cat1[0].name
            obj1.ID = main_cat1[0]._id
            let lst3 = []
            for (var xyz in sub_cat1) {
                const count_ads_sub = await advertise.count({ category_id: sub_cat1[xyz]._id })
                let obj3 = {}
                obj3._id = sub_cat1[xyz]._id,
                    obj3.name = sub_cat1[xyz].name,
                    obj3.isActive = sub_cat1[xyz].isActive,
                    obj3.parent_Id = sub_cat1[xyz].parent_Id,
                    obj3.createdAt = sub_cat1[xyz].createdAt,
                    obj3.updatedAt = sub_cat1[xyz].updatedAt,
                    obj3.total_ads_count = count_ads_sub
                lst3.push(obj3)
            }
            console.log(lst3)
            obj1.child = lst3
            datacat.push(obj1)
        }

        if (!category1) {
            const main_cat1 = await Category.find({ parent_Id: null })
            for (var xyz in main_cat1) {
                const sub_cat1 = await Category.find({ parent_Id: main_cat1[xyz]._id })
                lstdata.push(sub_cat1)
            }

            // const sub_cat1 = await Category.find({ parent_Id: category1 })

            let lst3 = []
            let lst4 = []
            let lst6 = []
            for (var xyz in main_cat1) {
                let obj1 = {}
                obj1.parentname = main_cat1[xyz].name
                obj1.parentID = main_cat1[xyz]._id
                const sub_cat1 = await Category.find({ parent_Id: main_cat1[xyz]._id })
                lst5 = []
                for (var abc in sub_cat1) {
                    const count_ads_sub = await advertise.count({ category_id: sub_cat1[abc]._id })
                    let obj3 = {}
                    obj3._id = sub_cat1[abc]._id,
                        obj3.name = sub_cat1[abc].name,
                        obj3.isActive = sub_cat1[abc].isActive,
                        obj3.parent_Id = sub_cat1[abc].parent_Id,
                        obj3.createdAt = sub_cat1[abc].createdAt,
                        obj3.updatedAt = sub_cat1[abc].updatedAt,
                        obj3.total_ads_count = count_ads_sub
                    lst5.push(obj3)
                }
                obj1.child = lst5
                datacat.push(obj1)
            }
        }


        //city
        var city3 = [];
        if (city1) {
            city3.push(city1)
        }

        if (!city1) {
            let city12 = await cities.find({}, "_id")
            for (var abcd in city12) {
                city3.push(city12[abcd]._id)
            }
        }


        //main_search
        var reg1 = []
        if (main_search) {
            var regexp = new RegExp("^" + main_search, "i");
            reg1.push(regexp)
        }

        if (!main_search) {
            let re1 = await advertise.find({}, "title")
            for (var abcd in re1) {
                reg1.push(re1[abcd].title)
            }
        }

        var price3 = []
        var price4 = []

        if (!main_search && !city1 && !g_price1 && !l_price1 && !category1 && !subdivision_id1) {
            const allads12 = await advertise.find({}).limit(limit).skip(skip);
            const totlen = allads12.length
            let helperfunction = () => {
                let response = res.statusCode;
                let message = "These Advertise"
                let status1 = true;
                return res.status(200).send({ page: page, size: size, Total_ADS: totlen, response: response, city: citylst2, maximum_price: gpr, message: message, status: status1, category: datacat, data: allads12 })
            }
            helperfunction()
        }

        //If Price is Given
        else if (g_price1 && l_price1) {
            const data_final1 = await advertise.find({
                city_id: { $in: city3 },
                title: { $in: reg1 },
                subdivision_id: { $in: sublst },
                price: { $lte: l_price1, $gte: g_price1 },
                category_id: { $in: lstdata },

            }).limit(limit).skip(skip);
            lengthdata = data_final1.length
            let helperfunction = () => {
                let response = res.statusCode;
                let message = "These Advertise"
                let status1 = true;
                return res.status(200).send({ page: page, size: size, SubCategory_Count: subcat_count, Total_ADS: lengthdata, response: response, city: citylst2, maximum_price: gpr, message: message, status: status1, category: datacat, data: data_final1 })
            }
            helperfunction()
        }

        //If Price is not Given
        else if (!g_price1 && !l_price1) {
            let pr1 = await advertise.find({}, "price")
            for (var abcd in pr1) {
                price3.push(pr1[abcd].price)
            }
            const data_final1 = await advertise.find({
                city_id: { $in: city3 },
                title: { $in: reg1 },
                price: { $in: price3 },
                category_id: { $in: lstdata },
                subdivision_id: { $in: sublst }
            }).limit(limit).skip(skip);
            lengthdata = data_final1.length
            let helperfunction = () => {
                let response = res.statusCode;
                let message = "These Advertise"
                let status1 = true;
                return res.status(200).send({ page: page, size: size, Total_ADS: lengthdata, response: response, city: citylst2, maximum_price: gpr, message: message, status: status1, category: datacat, data: data_final1 })
            }
            helperfunction()
        }
    } catch (e) {
        console.log(e)
        res.status(400).send("Some Error Is Occured")
    }

}

//main search api
const search_api1 = async(req, res) => {
    try {
        var { main_search, location1, g_price1, l_price1, category1, page, size } = req.query;
        if (!page) {
            page = 1
        }
        if (!size) {
            size = 2
        }
        const price2 = parseInt(g_price1)
        const price5 = parseInt(l_price1)
        const limit = parseInt(size)
        const skip = (page - 1) * size;
        console.log(category1)

        if (!main_search && !city1 && !g_price1 && !l_price1 && !category1) {
            const main_cat = await Category.find({ parent_Id: null })
            const main_cat1 = await Category.find({ parent_Id: null }, "_id")
            var datacat = []
            for (var xyz in main_cat1) {
                const sub_cat = await Category.find({ parent_Id: main_cat1[xyz] })
                var objcat = {}
                objcat.name = main_cat[xyz].name
                objcat.isActive = main_cat[xyz].isActive
                objcat.parent_Id = main_cat[xyz].parent_Id
                objcat.image = main_cat[xyz].image
                objcat.child_cat = sub_cat
                datacat.push(objcat)
            }
            return res.send(datacat)
        }

        var lstdata = []
        if (category1) {
            const datafil = await Category.find({ category_id: category1 }, "_id")
            console.table(datafil)
            const childfil = await Category.find({ parent_Id: datafil }, "_id")
            for (var abcd in childfil) {
                lstdata.push(childfil[abcd]._id)
            }
        }

        if (!category1) {
            const datafil = await Category.find({}, "_id")
            const childfil = await Category.find({ parent_Id: datafil }, "_id")
            for (var abcd in childfil) {
                lstdata.push(childfil[abcd]._id)
            }
        }


        var location2 = [];
        if (location1) {
            location2.push(location1)
        }

        if (!location1) {
            let locat1 = await advertise.find({}, "location")
            for (var abcd in locat1) {
                location2.push(locat1[abcd].location)
            }
        }

        var reg1 = []
        if (main_search) {
            var regexp = new RegExp("^" + main_search, "i");
            reg1.push(regexp)
        }

        if (!main_search) {
            let re1 = await advertise.find({}, "title")
            for (var abcd in re1) {
                reg1.push(re1[abcd].title)
            }
        }

        var price3 = []
        var price4 = []
        if (g_price1 && l_price1) {
            const data_final1 = await advertise.find({
                location: { $in: location2 },
                title: { $in: reg1 },
                price: { $lte: l_price1, $gte: g_price1 },
                category_id: { $in: lstdata },
            }).limit(limit).skip(skip);
            let helperfunction = () => {
                let response = res.statusCode;
                let message = "These Advertise"
                let status1 = true;
                res.status(200).send({ page, response: response, message: message, status: status1, size, data: data_final1 })
            }
            helperfunction()
        }

        if (!g_price1 && !l_price1) {
            let pr1 = await advertise.find({}, "price")
            for (var abcd in pr1) {
                price3.push(pr1[abcd].price)
            }
            const data_final1 = await advertise.find({
                city: { $in: city },
                title: { $in: reg1 },
                price: { $in: price3 },
                category_id: { $in: lstdata },
            }).limit(limit).skip(skip);
            let helperfunction = () => {
                let response = res.statusCode;
                let message = "These Advertise "
                let status1 = true;
                res.status(200).send({ page, response: response, message: message, status: status1, size, data: data_final1 })
            }
            helperfunction()
        }

    } catch (e) {
        console.log(e)
        res.status(400).send("Some Error Is Occured")
    }
}

//Publish and unpublish my ads
const publish_unpublish = async(req, res) => {
    const { ad_id } = req.query
    const data1 = await advertise.find({ _id: ad_id }, 'is_Active')
    if (data1[0].is_Active == false) {
        const changestatus = { is_Active: true }
        const upduser = await advertise.findByIdAndUpdate(ad_id, changestatus)
        let helperfunction = () => {
            let response = res.statusCode;
            let message = "This Advertise Added to Favourite";
            let status = true;
            let Data = { is_Active: true };
            return res.status(201).send({ response: response, message: message, status: status, Data: Data })
        }
        helperfunction()
    }
    if (data1[0].is_Active == true) {
        const changestatus = { is_Active: false }
        const upduser = await advertise.findByIdAndUpdate(ad_id, changestatus)
        let helperfunction = () => {
            let response = res.statusCode;
            let message = "This Advertise Added to Favourite";
            let status = true;
            let Data = { published: false };
            return res.status(201).send({ response: response, message: message, status: status, Data: Data })
        }
        helperfunction()
    }
}

//View all advertise
const getadvertise_pagination = async(req, res) => {
    try {
        let response;
        let message;
        let status1;
        let AllAds;
        let { id, status, search, page, size } = req.query;
        if (!page) {
            page = 1
        }
        if (!size) {
            size = 2
        }
        const limit = parseInt(size)
        const skip = (page - 1) * size;
        var regexp = new RegExp("^" + search, "i");
        if (!status && !search) {
            const adslimit = await advertise.find({ user_id: id }).limit(limit).skip(skip);
            const adsids = await advertise.find({ user_id: id }, '_id').limit(limit).skip(skip);
            var datafinal = []
            for (var i in adsids) {
                var query = await views.count({ ad_Id: adsids[i] });
                var testdata = {}
                testdata.title = adslimit[i].title;
                testdata.price = adslimit[i].price;
                testdata.description = adslimit[i].description;
                testdata.images = adslimit[i].images;
                testdata.createdAt = adslimit[i].createdAt;
                testdata.is_Active = adslimit[i].is_Active;
                testdata.subdivision_id = adslimit[i].subdivision_id;
                testdata.city_id = adslimit[i].city_id;
                testdata.views = query;
                datafinal.push(testdata)
            }
            const adslimitcount = await advertise.count()
            let helperfunction = () => {
                response = res.statusCode;
                message = "This is All Advertise without status and title"
                status1 = true;
                res.status(200).send({ page, size, count: adslimitcount, data: datafinal })
            }
            helperfunction()
        } else if (!status) {
            const adslimit = await advertise.find({ user_id: id }).where("title").equals(regexp).limit(limit).skip(skip);
            const adsids = await advertise.find({ user_id: id }, '_id').where("title").equals(regexp).limit(limit).skip(skip);
            var datafinal = []
            for (var i in adsids) {
                var query = await views.count({ ad_Id: adsids[i] });
                var testdata = {}
                testdata.title = adslimit[i].title;
                testdata.price = adslimit[i].price;
                testdata.description = adslimit[i].description;
                testdata.images = adslimit[i].images;
                testdata.posted_On = adslimit[i].posted_On;
                testdata.is_Active = adslimit[i].is_Active;
                testdata.subdivision_id = adslimit[i].subdivision_id;
                testdata.views = query;
                datafinal.push(testdata)
            }
            const adslimitcount = await advertise.count()

            let helperfunction = () => {
                response = res.statusCode;
                message = "This is All Advertise without status"
                status1 = true;
                res.status(200).send({ page, size, count: adslimitcount, data: datafinal })
            }
            helperfunction()
        } else if (!search) {
            const adslimit = await advertise.find({ user_id: id }).where("is_Active").equals(status).limit(limit).skip(skip);
            const adsids = await advertise.find({ user_id: id }, '_id').where("is_Active").equals(status).limit(limit).skip(skip);
            var datafinal = []
            for (var i in adsids) {
                var query = await views.count({ ad_Id: adsids[i] });
                var testdata = {}
                testdata.title = adslimit[i].title;
                testdata.price = adslimit[i].price;
                testdata.description = adslimit[i].description;
                testdata.images = adslimit[i].images;
                testdata.posted_On = adslimit[i].posted_On;
                testdata.is_Active = adslimit[i].is_Active;
                testdata.subdivision_id = adslimit[i].subdivision_id;
                testdata.views = query;
                datafinal.push(testdata)
            }
            const adslimitcount = await advertise.count()
            let helperfunction = () => {
                response = res.statusCode;
                message = "This is All Advertise without Search"
                status1 = true;
                AllAds = datafinal;
                return res.status(201).send({ page, size, count: adslimitcount, data: datafinal })
            }
            helperfunction()
        } else {
            const adslimit = await advertise.find({ user_id: id }).where("is_Active").equals(status).where("title").equals(regexp).limit(limit).skip(skip);
            const adsids = await advertise.find({ user_id: id }, '_id').where("is_Active").equals(status).where("title").equals(regexp).limit(limit).skip(skip);
            var datafinal = []
            for (var i in adsids) {
                var query = await views.count({ ad_Id: adsids[i] });
                var testdata = {}
                testdata.title = adslimit[i].title;
                testdata.price = adslimit[i].price;
                testdata.description = adslimit[i].description;
                testdata.images = adslimit[i].images;
                testdata.posted_On = adslimit[i].posted_On;
                testdata.is_Active = adslimit[i].is_Active;
                testdata.subdivision_id = adslimit[i].subdivision_id;
                testdata.views = query;
                datafinal.push(testdata)
            }
            const adslimitcount = await advertise.count()
            let helperfunction = () => {
                response = res.statusCode;
                message = "This is All Advertise including title and status"
                status1 = true;
                AllAds = datafinal;
                return res.status(201).send({ page, size, count: adslimitcount, data: datafinal })
            }
            helperfunction()
        }
    } catch (e) {
        console.log(e)
        res.status(400).send("Some Error Is Occured")
    }
}

//View all availible advertise
const getavailible = async(req, res) => {
    try {
        const getadv = await advertise.find({ is_Deleted: false })
        let helperfunction = () => {
            let response = res.statusCode;
            let message = "This is All Availible Advertise"
            let status = true;
            let Data = getadv;
            return res.status(201).send({ response: response, message: message, status: status, Data: Data })
        }
        helperfunction()
    } catch (e) {
        console.log(e)
        res.status(400).send("Some Error Is Occured")
    }
}

//create advertise
const addadvertise = async(req, res) => {
    try {
        const path = 'backend/advertiseimages/' + Date.now() + '.jpeg'
        const imgdata = req.body.images;
        // to convert base64 format into random filename
        const base64Data = imgdata.replace(/^data:([A-Za-z-+/]+);base64,/, '');
        fs.writeFileSync(path, base64Data, { encoding: 'base64' });
        console.log(path);
        req.body.images = path;
        const addadv = new advertise({
            user_id: req.query.user_id,
            title: req.body.title,
            price: req.body.price,
            description: req.body.description,
            city_id: req.query.city_id,
            images: req.body.images,
            is_Active: req.body.is_Active,
            deleted_On: req.body.deleted_On,
            is_Deleted: req.body.is_Deleted,
            category_id: req.query.category_id,
            latitude: req.body.latitude,
            longitude: req.body.longitude,
            subdivision_id: req.query.subdivision_id
        })
        console.log(addadv);
        let insertadv = await addadv.save();
        let helperfunction = () => {
            let response = res.statusCode;
            let message = "Advertise is inserted"
            let status = true;
            let Data = insertadv;
            return res.status(201).send({ response: response, message: message, status: status, Data: Data })
        }
        helperfunction()
    } catch (e) {
        console.log(e)
        res.status(400).send("Some Error Is Occured")
    }
}

//DELETE ADVERTISE
const deleteadvertise = async(req, res) => {
    try {
        const del = await advertise.findByIdAndDelete(req.params.id)
        let helperfunction = () => {
            let response = res.statusCode;
            let message = "Advertise Is Deleted"
            let status = true;
            return res.status(201).send({ response: response, message: message, status: status })
        }
        helperfunction()
    } catch (e) {
        console.log(e)
        res.status(500).send("Some Error Is Occured")
    }
}

//UPDATE ADVERTISE
const updateadvertise = async(req, res) => {
    try {
        const { _id, user_id } = req.query;
        const query = { _id: _id, user_id: user_id }
        const updadv = await advertise.findByIdAndUpdate(query, req.body, {
            new: true //new updated value usi waqt mil jae uskay liye kia hay

        })
        let helperfunction = () => {
            let response = res.statusCode;
            let message = "Advertise Is Updated"
            let status = true;
            let Data = updadv;
            return res.status(201).send({ response: response, message: message, status: status, Data: Data })
        }
        helperfunction()
    } catch (e) {
        console.log(e)
        res.status(500).send("Some Error Is Occured")
    }
}

//UPDATE ADVERTISE IS DELETED
const isdeleted = async(req, res) => {
    try {
        const _id = req.params.id;
        let updel = {
            is_Deleted: true,
            deleted_On: Date.now()
        }
        const isdel = await advertise.findByIdAndUpdate(_id, updel, {
            new: true
        })
        let helperfunction = () => {
            let response = res.statusCode;
            let message = "Advertise Is Deleted"
            let status = true;
            let Data = isdel;
            return res.status(201).send({ response: response, message: message, status: status, Data: Data })
        }
        helperfunction()
    } catch (e) {
        console.log(e)
        res.status(500).send("Some Error Is Occured")
    }
}

//VIEW SPECIFIC ADVERTISE
const specificadvertise = async(req, res) => {
    try {
        const _id = req.params.id;
        const getspead = await advertise.findById({ _id: _id })
        let helperfunction = () => {
            let response = res.statusCode;
            let status = true;
            let Data = getspead;
            return res.status(201).send({ response: response, status: status, Data: Data })
        }
        helperfunction()
    } catch (e) {
        console.log(e)
        res.status(400).send("Some Error Is Occured")
    }
}

module.exports = { getadvertise_pagination, publish_unpublish, search_api, get_sub_ads, google_map, getavailible, isdeleted, specificadvertise, updateadvertise, deleteadvertise, addadvertise }