"use client";
import {useEffect,useRef,useState} from 'react';
import type {Property} from '@/types/property';
export type ChatMessage={role:'user'|'assistant';content:string;properties?:Property[]};
export type ChatContext={scope:'system'|'agency';propertySlug?:string;agencySlug?:string;agencyName?:string};
export type Conversation={id:string;title:string;context:ChatContext;messages:ChatMessage[];updatedAt:string};
const key='estatein:guest-chat-history:v1';
export function useChatHistory(){
 const [conversations,setConversations]=useState<Conversation[]>([]),[ready,setReady]=useState(false),[account,setAccount]=useState(false),[error,setError]=useState(false);
 const loadedSuccessfully=useRef(false);
 const rows=useRef<Conversation[]>([]),remote=useRef(false),queue=useRef(Promise.resolve());
 useEffect(()=>{let active=true;
 (async()=>{try{
 const response=await fetch('/api/ai/conversations/',{cache:'no-store'});
 if(!active)return;
 let loaded:Conversation[]=[];
 if(response.status===401){loaded=JSON.parse(localStorage.getItem(key)||'[]')}
 else{if(!response.ok)throw new Error();loaded=(await response.json() as {conversations:Conversation[]}).conversations;remote.current=true;setAccount(true)}
 if(!Array.isArray(loaded))throw new Error();
 loadedSuccessfully.current=true;rows.current=loaded.filter(c=>c.id&&c.context&&Array.isArray(c.messages));setConversations(rows.current);
 }catch{if(active)setError(true)}finally{if(active)setReady(true)}})();
 return()=>{active=false};},[]);
 function save(conversation:Conversation){
 rows.current=[conversation,...rows.current.filter(c=>c.id!==conversation.id)].slice(0,100);setConversations(rows.current);
 if(!loadedSuccessfully.current){setError(true);return}
 if(remote.current){queue.current=queue.current.then(async()=>{try{const r=await fetch('/api/ai/conversations/',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(conversation)});setError(!r.ok)}catch{setError(true)}})}
 else {try{localStorage.setItem(key,JSON.stringify(rows.current));}catch{setError(true)}}
 }
 return {conversations,ready,account,error,save};
}
