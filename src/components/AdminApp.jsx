import React,{useMemo,useState}from'react';
import{useMutation,useQuery,useQueryClient}from'@tanstack/react-query';
import{api,jsonBody}from'../api.js';
import{ExternalLink,Image as ImageIcon,Inbox,LogOut,Plus,RefreshCw,Save,Settings,Trash2,Upload}from'lucide-react';

export default function AdminApp(){
 const qc=useQueryClient();
 const auth=useQuery({queryKey:['auth'],queryFn:()=>api('/api/auth/me'),retry:false});
 if(auth.isLoading)return <State text="Загрузка админки"/>;
 if(auth.error?.status===401)return <Login onDone={()=>qc.invalidateQueries({queryKey:['auth']})}/>;
 if(auth.error)return <State text={auth.error.message}/>;
 return <Shell user={auth.data.user}/>;
}

function Login({onDone}){
 const m=useMutation({mutationFn:v=>api('/api/auth/login',{method:'POST',body:jsonBody(v)}),onSuccess:onDone});
 function submit(e){e.preventDefault();const f=new FormData(e.currentTarget);m.mutate({email:f.get('email'),password:f.get('password')})}
 return <div className="admin-login"><div className="admin-login__art"><span>ASTER</span><strong>CONTROL<br/>ROOM</strong><p>Контент, заявки и визуал — в одном месте.</p></div><form className="admin-login__form" onSubmit={submit}><b>ASTER•NASTYA / ADMIN</b><h1>Вход</h1><label>Email<input name="email" type="email" required defaultValue="admin@aster.local"/></label><label>Пароль<input name="password" type="password" required/></label>{m.error&&<p className="admin-error">{m.error.message}</p>}<button className="admin-primary" disabled={m.isPending}>{m.isPending?'Входим…':'Войти'}</button></form></div>
}

const tabs=[['home','Главная'],['services','Услуги'],['media','Медиа'],['bookings','Заявки'],['settings','Настройки']];

function Shell({user}){
 const qc=useQueryClient(),[tab,setTab]=useState('home');
 const site=useQuery({queryKey:['admin-site'],queryFn:()=>api('/api/admin/site')});
 const media=useQuery({queryKey:['media'],queryFn:()=>api('/api/admin/media')});
 const logout=useMutation({mutationFn:()=>api('/api/auth/logout',{method:'POST'}),onSuccess:()=>qc.invalidateQueries({queryKey:['auth']})});
 const refresh=()=>Promise.all([qc.invalidateQueries({queryKey:['admin-site']}),qc.invalidateQueries({queryKey:['media']}),qc.invalidateQueries({queryKey:['public-site']}),qc.invalidateQueries({queryKey:['bookings']})]);
 return <div className="admin-shell"><aside className="admin-sidebar"><div className="admin-logo">ASTER<span>•</span>NASTYA<small>CONTROL ROOM</small></div><nav>{tabs.map(([k,l])=><button className={tab===k?'active':''} key={k} onClick={()=>setTab(k)}>{l}</button>)}</nav><div className="admin-side-bottom"><a href="/" target="_blank" rel="noreferrer"><ExternalLink size={15}/>Сайт</a><button onClick={()=>logout.mutate()}><LogOut size={15}/>Выйти</button><small>{user.email}</small></div></aside><main className="admin-main"><header className="admin-top"><div><small>ASTER CMS</small><h2>{tabs.find(x=>x[0]===tab)?.[1]}</h2></div><button className="icon-button" onClick={refresh}><RefreshCw size={18}/></button></header>{site.isLoading?<State text="Загрузка"/>:site.error?<State text={site.error.message}/>:<Content tab={tab} site={site.data} media={media.data?.items||[]} refresh={refresh}/>}</main></div>
}

function Content({tab,site,media,refresh}){
 if(tab==='home')return <Home site={site} media={media} refresh={refresh}/>;
 if(tab==='services')return <Services items={site.services} refresh={refresh}/>;
 if(tab==='media')return <Media items={media} refresh={refresh}/>;
 if(tab==='bookings')return <Bookings/>;
 return <SettingsPage settings={site.settings} refresh={refresh}/>;
}

function Home({site,media,refresh}){
 const [d,setD]=useState(site.settings),[file,setFile]=useState(null);
 const save=useMutation({mutationFn:v=>api('/api/admin/settings',{method:'PUT',body:jsonBody(v)}),onSuccess:refresh});
 const upload=useMutation({mutationFn:async()=>{if(!file)throw new Error('Выберите фото');const fd=new FormData();fd.append('image',file);fd.append('alt_text',d.brand+' — главное фото');const img=await api('/api/admin/media',{method:'POST',body:fd});return api('/api/admin/settings',{method:'PUT',body:jsonBody({...cleanSettings(d),hero_mode:'image',hero_media_id:img.id})})},onSuccess:async v=>{setD(v);setFile(null);await refresh()}});
 return <section><Head title="Главная" text="Первый экран, фото и позиционирование."/><div className="admin-grid"><Panel title="Контент"><FormField label="Кикер"><input value={d.hero_kicker} onChange={e=>setD({...d,hero_kicker:e.target.value})}/></FormField><FormField label="Заголовок"><input value={d.hero_title_top} onChange={e=>setD({...d,hero_title_top:e.target.value})}/></FormField><FormField label="Вторая строка"><input value={d.hero_title_bottom} onChange={e=>setD({...d,hero_title_bottom:e.target.value})}/></FormField><FormField label="Описание"><textarea rows="4" value={d.hero_description} onChange={e=>setD({...d,hero_description:e.target.value})}/></FormField><FormField label="О мастере"><textarea rows="5" value={d.about_text} onChange={e=>setD({...d,about_text:e.target.value})}/></FormField><button className="admin-primary" onClick={()=>save.mutate(cleanSettings(d))}><Save size={15}/>Сохранить</button>{save.error&&<p className="admin-error">{save.error.message}</p>}</Panel><Panel title="Главное фото"><div className="hero-admin-preview">{d.hero_image_url?<img src={d.hero_image_url} alt="Hero"/>:<div>ASTER ART</div>}</div><label className="upload-box"><Upload size={20}/><span>{file?file.name:'Выбрать JPG / PNG / WebP'}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><button className="admin-primary" disabled={!file||upload.isPending} onClick={()=>upload.mutate()}>{upload.isPending?'Загрузка…':'Поставить фото на главную'}</button><button className="admin-secondary" onClick={()=>save.mutate({...cleanSettings(d),hero_mode:'art',hero_media_id:null})}>Вернуть арт</button>{media.length>0&&<FormField label="Фото из библиотеки"><select value={d.hero_media_id||''} onChange={e=>setD({...d,hero_media_id:e.target.value?Number(e.target.value):null,hero_mode:e.target.value?'image':'art'})}><option value="">Не выбрано</option>{media.map(m=><option key={m.id} value={m.id}>{m.original_name}</option>)}</select></FormField>}</Panel></div></section>
}

function Services({items,refresh}){
 const [draft,setDraft]=useState({name:'Новая услуга',note:'',price:'1 500 ₽',sort_order:items.length,is_active:true});
 const create=useMutation({mutationFn:v=>api('/api/admin/services',{method:'POST',body:jsonBody(v)}),onSuccess:refresh});
 return <section><Head title="Услуги" text="Цены и позиции на сайте."/><Panel title="Добавить услугу"><div className="service-editor"><input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/><input value={draft.note} placeholder="Подпись" onChange={e=>setDraft({...draft,note:e.target.value})}/><input value={draft.price} onChange={e=>setDraft({...draft,price:e.target.value})}/><button className="admin-primary" onClick={()=>create.mutate(draft)}><Plus size={15}/>Добавить</button></div></Panel><div className="admin-list">{items.map(x=><ServiceRow key={x.id} item={x} refresh={refresh}/>)}</div></section>
}
function ServiceRow({item,refresh}){
 const[d,setD]=useState({...item,is_active:Boolean(item.is_active)});
 const save=useMutation({mutationFn:()=>api('/api/admin/services/'+item.id,{method:'PUT',body:jsonBody({name:d.name,note:d.note,price:d.price,sort_order:Number(d.sort_order),is_active:d.is_active})}),onSuccess:refresh});
 const del=useMutation({mutationFn:()=>api('/api/admin/services/'+item.id,{method:'DELETE'}),onSuccess:refresh});
 return <article className="admin-row"><input value={d.name} onChange={e=>setD({...d,name:e.target.value})}/><input value={d.note} onChange={e=>setD({...d,note:e.target.value})}/><input value={d.price} onChange={e=>setD({...d,price:e.target.value})}/><label className="check"><input type="checkbox" checked={d.is_active} onChange={e=>setD({...d,is_active:e.target.checked})}/>Показывать</label><button className="admin-secondary" onClick={()=>save.mutate()}><Save size={14}/></button><button className="admin-danger" onClick={()=>confirm('Удалить услугу?')&&del.mutate()}><Trash2 size={14}/></button></article>
}

function Media({items,refresh}){
 const[file,setFile]=useState(null),[alt,setAlt]=useState('');
 const up=useMutation({mutationFn:()=>{const fd=new FormData();fd.append('image',file);fd.append('alt_text',alt);return api('/api/admin/media',{method:'POST',body:fd})},onSuccess:()=>{setFile(null);setAlt('');refresh()}});
 return <section><Head title="Медиа" text="Фото мастера и работ."/><Panel title="Загрузить"><div className="media-upload"><label className="upload-box"><Upload size={20}/><span>{file?file.name:'Выбрать изображение'}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><input placeholder="Alt-текст" value={alt} onChange={e=>setAlt(e.target.value)}/><button className="admin-primary" disabled={!file} onClick={()=>up.mutate()}>Загрузить</button></div></Panel><div className="media-grid">{items.map(i=><MediaCard key={i.id} item={i} refresh={refresh}/>)}</div></section>
}
function MediaCard({item,refresh}){
 const del=useMutation({mutationFn:()=>api('/api/admin/media/'+item.id,{method:'DELETE'}),onSuccess:refresh});
 return <figure className="media-card"><img src={item.url} alt={item.alt_text||item.original_name}/><figcaption><b>{item.original_name}</b><button onClick={()=>confirm('Удалить файл?')&&del.mutate()}><Trash2 size={14}/></button></figcaption>{del.error&&<small>{del.error.message}</small>}</figure>
}

function Bookings(){
 const qc=useQueryClient(),[status,setStatus]=useState('all');
 const q=useQuery({queryKey:['bookings',status],queryFn:()=>api('/api/admin/bookings?status='+status)});
 const upd=useMutation({mutationFn:({id,status})=>api('/api/admin/bookings/'+id,{method:'PATCH',body:jsonBody({status})}),onSuccess:()=>qc.invalidateQueries({queryKey:['bookings']})});
 const labels={new:'Новая',contacted:'Связались',confirmed:'Подтверждена',done:'Завершена',cancelled:'Отменена'};
 return <section><Head title="Заявки" text="Лиды с формы записи."/><div className="filters">{['all',...Object.keys(labels)].map(x=><button className={status===x?'active':''} key={x} onClick={()=>setStatus(x)}>{x==='all'?'Все':labels[x]}</button>)}</div>{q.isLoading?<State text="Загрузка"/>:<div className="bookings">{q.data?.items?.map(b=><article key={b.id}><div><b>{b.name}</b><a href={contactHref(b.contact)}>{b.contact}</a></div><span>{b.service_name||'Без услуги'}</span><small>{b.desired_date||'Дата не указана'}</small><p>{b.comment||'—'}</p><select value={b.status} onChange={e=>upd.mutate({id:b.id,status:e.target.value})}>{Object.entries(labels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></article>)}</div>}</section>
}

function SettingsPage({settings,refresh}){
 const[d,setD]=useState(settings);
 const save=useMutation({mutationFn:v=>api('/api/admin/settings',{method:'PUT',body:jsonBody(v)}),onSuccess:refresh});
 return <section><Head title="Настройки" text="Бренд, город и ссылки."/><Panel title="Основное"><FormField label="Название"><input value={d.brand} onChange={e=>setD({...d,brand:e.target.value})}/></FormField><FormField label="Город"><input value={d.city} onChange={e=>setD({...d,city:e.target.value})}/></FormField><FormField label="Telegram"><input value={d.telegram} onChange={e=>setD({...d,telegram:e.target.value})}/></FormField><FormField label="Онлайн-запись"><input value={d.online_booking_url} onChange={e=>setD({...d,online_booking_url:e.target.value})}/></FormField><FormField label="Подпись о мастере"><input value={d.about_note||''} onChange={e=>setD({...d,about_note:e.target.value})}/></FormField><button className="admin-primary" onClick={()=>save.mutate(cleanSettings(d))}><Settings size={15}/>Сохранить</button></Panel></section>
}

function cleanSettings(s){return{brand:s.brand,city:s.city,telegram:s.telegram||'',online_booking_url:s.online_booking_url||'',hero_mode:s.hero_mode||'art',hero_media_id:s.hero_media_id||null,hero_kicker:s.hero_kicker,hero_title_top:s.hero_title_top,hero_title_bottom:s.hero_title_bottom,hero_description:s.hero_description,about_text:s.about_text,about_note:s.about_note||''}}
function Head({title,text}){return <div className="admin-head"><small>ASTER / CONTROL</small><h1>{title}</h1><p>{text}</p></div>}
function Panel({title,children}){return <section className="admin-panel"><h3>{title}</h3>{children}</section>}
function FormField({label,children}){return <label className="admin-field"><span>{label}</span>{children}</label>}
function State({text}){return <div className="admin-state"><Inbox size={26}/><span>{text}</span></div>}
function contactHref(v){if(/^@/.test(v))return'https://t.me/'+v.slice(1);if(/^\+?[\d\s()-]{7,}$/.test(v))return'tel:'+v.replace(/[^\d+]/g,'');return'#'}
