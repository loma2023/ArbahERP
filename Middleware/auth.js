const jwt=require("jsonwebtoken");
const User=require("../models/User");


module.exports=async(req,res,next)=>{


try{


let token=req.cookies.token;


if(!token)
return res.redirect("/login");



let decoded=
jwt.verify(token,process.env.JWT_SECRET);



req.user=
await User.findById(decoded.id)
.populate({
path:"role",
populate:{
path:"permissions"
}
});


next();


}catch(err){

res.redirect("/login");

}


}