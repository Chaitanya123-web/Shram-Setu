let signup_user=document.querySelector(".signup_user");
let login_user=document.querySelector(".login_user");
let findjob=document.querySelector(".findjob");
let hireworker=document.querySelector(".hireworker");
let profile=document.querySelector(".profile");
let service=document.querySelector(".service");
let about=document.querySelector(".about");


signup_user.addEventListener("click",()=>
{
    window.location.href='signup_user';
    
})

login_user.addEventListener("click",()=>
{
    window.location.href='login_user';
    
})

findjob.addEventListener("click",()=>
{
    window.location.href='signup_worker';
    
})

hireworker.addEventListener("click",()=>
{
    window.location.href='categorySelector';
    
})

profile.addEventListener("click",()=>
{
    window.location.href='profile';
    
})

service.addEventListener("click",()=>
{
    window.location.href='service';
    
})
about.addEventListener("click",()=>
{
    window.location.href='about';
    
})
let currentIndex = 0;
const images = document.querySelectorAll(".image-wrapper");

function updateSlider() {
  images.forEach((img, index) => {
    img.classList.toggle("active", index === currentIndex);
  });
}

function scrollLeft() {
  currentIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
  updateSlider();
}

function scrollRight() {
  currentIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
  updateSlider();
}

// Initialize slider
updateSlider();
