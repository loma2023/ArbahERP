module.exports=(permission)=>{


return (req,res,next)=>{


let userPermissions=
req.user.role.permissions
.map(p=>p.name);



if(
!userPermissions.includes(permission)
)
{

return res.status(403)
.send("ليس لديك صلاحية");


}



next();


}


}