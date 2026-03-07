const chatBox = document.getElementById("chatBox")

loadHistory()

function addMessage(text,type){

const msg=document.createElement("div")

msg.className="message "+type

msg.textContent=text

chatBox.appendChild(msg)

chatBox.scrollTop=chatBox.scrollHeight

saveHistory()

}

async function sendMessage(){

const input=document.getElementById("userInput")

const message=input.value.trim()

if(!message) return

addMessage(message,"user")

input.value=""

const typing=document.createElement("div")

typing.className="message bot typing"

typing.textContent="AI is typing..."

chatBox.appendChild(typing)

chatBox.scrollTop=chatBox.scrollHeight

try{

const res=await fetch("http://localhost:5000/chat",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({message})

})

const data=await res.json()

typing.remove()

typeText(data.reply)

}catch{

typing.textContent="Server error"

}

}

function typeText(text){

const msg=document.createElement("div")

msg.className="message bot"

chatBox.appendChild(msg)

let i=0

const interval=setInterval(()=>{

msg.textContent+=text[i]

i++

if(i>=text.length){

clearInterval(interval)

saveHistory()

}

},15)

}

function handleEnter(e){

if(e.key==="Enter") sendMessage()

}

function saveHistory(){

localStorage.setItem("chatHistory",chatBox.innerHTML)

}

function loadHistory(){

const history=localStorage.getItem("chatHistory")

if(history){

chatBox.innerHTML=history

}

}