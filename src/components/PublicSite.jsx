import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Check, Send, X } from 'lucide-react';
import { api, jsonBody } from '../api.js';

export default function PublicSite() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['public-site'],
    queryFn: () => api('/api/public/site')
  });
  const [bookingOpen, setBookingOpen] = useState(false);

  if (error) return <PublicError onRetry={refetch} />;
  if (isLoading && !data) return <PublicSkeleton />;
  if (!data) return null;

  const { settings, services, stats, reviews, portfolio } = data;
  return (
    <div className="site-shell">
      <div className="noise" aria-hidden="true" />
      <Header settings={settings} onBook={() => setBookingOpen(true)} />
      <main>
        <Hero settings={settings} onBook={() => setBookingOpen(true)} />
        <Services services={services} onBook={() => setBookingOpen(true)} />
        {portfolio.length > 0 && <Portfolio items={portfolio} />}
        <Manifesto settings={settings} />
        <Stats stats={stats} />
        <Reviews reviews={reviews} />
        <BookingSection settings={settings} onBook={() => setBookingOpen(true)} />
      </main>
      <Footer settings={settings} />
      {bookingOpen && <BookingDialog services={services} settings={settings} onClose={() => setBookingOpen(false)} />}
    </div>
  );
}

function Header({ settings, onBook }) {
  return (
    <header className="header">
      <a className="wordmark" href="#top" aria-label={`${settings.brand}, на главную`}>
        ASTER<span>•</span>NASTYA
      </a>
      <nav className="nav" aria-label="Основная навигация">
        <a href="#services">Услуги</a><a href="#works">Работы</a><a href="#about">О мастере</a><a href="#reviews">Отзывы</a>
      </nav>
      <button className="button button--compact" onClick={onBook}>Записаться</button>
    </header>
  );
}

function Hero({ settings, onBook }) {
  const hasPhoto = settings.hero_mode === 'image' && settings.hero_image_url;
  return (
    <section className={`hero ${hasPhoto ? 'hero--photo' : ''}`} id="top">
      <div className="hero__kicker reveal">{settings.hero_kicker}</div>
      <div className="hero__grid">
        <div className="hero__copy">
          <p className="eyebrow reveal reveal--1">Твоя форма. Твой характер.</p>
          <h1 className="hero__title reveal reveal--2"><span className="serif">{settings.hero_title_top}</span><span className="outline">{settings.hero_title_bottom}</span></h1>
          <p className="hero__description reveal reveal--3">{settings.hero_description}</p>
          <div className="hero__actions reveal reveal--4">
            <button className="button button--primary" onClick={onBook}>Записаться онлайн <ArrowUpRight size={16}/></button>
            {settings.telegram && <a className="text-link" href={settings.telegram} target="_blank" rel="noreferrer">Telegram <ArrowUpRight size={14}/></a>}
          </div>
        </div>
        <div className="hero-art reveal reveal--2" aria-label={hasPhoto ? settings.hero_alt || 'Фото мастера' : undefined} aria-hidden={!hasPhoto}>
          {hasPhoto ? (
            <figure className="hero-photo">
              <img src={settings.hero_image_url} alt={settings.hero_alt || `${settings.brand} — мастер по ресницам и бровям`} />
              <figcaption>BEAUTY / PORTRAIT</figcaption>
            </figure>
          ) : (
            <div className="hero-art__frame" aria-hidden="true">
              <div className="eye-shape eye-shape--outer"/><div className="eye-shape eye-shape--inner"/><div className="iris"/>
              {[1,2,3,4,5,6].map((n) => <div key={n} className={`lash lash--${n}`}/>) }
              <span className="hero-art__label">BEAUTY / 01</span>
            </div>
          )}
        </div>
      </div>
      <div className="marquee" aria-hidden="true"><div>soft glam • clean lines • lashes • brows • beauty with attitude • soft glam • clean lines •</div></div>
    </section>
  );
}

function Services({ services, onBook }) {
  return (
    <section className="section services" id="services">
      <SectionHeading number="01" kicker="Прайс" title="Выбери свой эффект" />
      <div className="service-list">
        {services.map((service, index) => (
          <button className="service-row" key={service.id} onClick={onBook}>
            <span className="service-row__index">{String(index + 1).padStart(2,'0')}</span>
            <span className="service-row__name">{service.name}<small>{service.note}</small></span>
            <span className="service-row__price">{service.price}</span><ArrowUpRight className="service-row__arrow" size={20}/>
          </button>
        ))}
      </div>
    </section>
  );
}

function Portfolio({ items }) {
  return (
    <section className="section portfolio" id="works">
      <SectionHeading number="02" kicker="Работы" title="Не обещания. Результат." />
      <div className="portfolio-grid">
        {items.map((item, index) => (
          <figure className={`work-card work-card--${(index % 3) + 1}`} key={item.id}>
            <img src={item.image_url} alt={item.alt_text || item.title} loading="lazy" />
            <figcaption><span>{item.category || 'ASTER LOOK'}</span><strong>{item.title}</strong></figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Manifesto({ settings }) {
  return (
    <section className="manifesto" id="about">
      <div className="manifesto__orb" aria-hidden="true" />
      <p className="section-label">03 / ПОДХОД</p>
      <p className="manifesto__text">{settings.about_text}</p>
      <div className="manifesto__note">{settings.about_note}</div>
    </section>
  );
}

function Stats({ stats }) {
  return (
    <section className="section stats-section"><SectionHeading number="04" kicker="Почему мне доверяют" title="Цифры без фильтров" />
      <div className="stats-grid">{stats.map((stat) => <article className="stat-card" key={stat.id}><strong>{stat.value}</strong><span>{stat.label}</span></article>)}</div>
    </section>
  );
}

function Reviews({ reviews }) {
  return (
    <section className="section reviews" id="reviews"><SectionHeading number="05" kicker="Отзывы" title="После зеркала" />
      <div className="review-grid">{reviews.map((review, index) => <figure className="review-card" key={review.id}><div className="stars" aria-label={`${review.rating} из 5`}>{'★'.repeat(review.rating)}</div><blockquote>«{review.text}»</blockquote><figcaption>{review.name}<span> / client {String(index + 1).padStart(2,'0')}</span></figcaption></figure>)}</div>
    </section>
  );
}

function BookingSection({ settings, onBook }) {
  return (
    <section className="booking-section" id="booking"><div><p className="section-label">06 / ЗАПИСЬ</p><h2>Ready for<br/><span>your look?</span></h2></div>
      <div className="booking-section__side"><p>{settings.city}. Оставь заявку на сайте — мастер увидит её в админке и подтвердит время.</p><button className="button button--primary button--wide" onClick={onBook}>Выбрать услугу <ArrowUpRight size={16}/></button>{settings.telegram && <a className="button button--ghost button--wide" href={settings.telegram} target="_blank" rel="noreferrer">Написать в Telegram</a>}{settings.online_booking_url && <a className="button button--ghost button--wide" href={settings.online_booking_url} target="_blank" rel="noreferrer">Внешняя онлайн-запись</a>}</div>
    </section>
  );
}

function Footer({ settings }) {
  return <footer className="footer"><div className="footer__brand">{settings.brand}</div><div className="footer__meta">LASHES & BROWS • {settings.city}</div><a className="admin-link" href="/admin">Админка</a><a className="deerflow" href="https://deerflow.tech" target="_blank" rel="noreferrer">Created By Deerflow</a></footer>;
}

function SectionHeading({ number, kicker, title }) {
  return <div className="section-heading"><p className="section-label">{number} / {kicker.toUpperCase()}</p><h2>{title}</h2></div>;
}

function BookingDialog({ services, settings, onClose }) {
  const dialogRef = useRef(null);
  const [sent, setSent] = useState(false);
  const mutation = useMutation({ mutationFn: (payload) => api('/api/public/bookings', { method: 'POST', body: jsonBody(payload) }), onSuccess: () => setSent(true) });

  useEffect(() => {
    const previous = document.activeElement;
    const first = dialogRef.current?.querySelector('input,select,textarea,button');
    first?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') return onClose();
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]):not([tabindex="-1"]),select:not([disabled]),textarea:not([disabled])')];
      if (!focusable.length) return;
      const firstNode = focusable[0]; const lastNode = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === firstNode) { event.preventDefault(); lastNode.focus(); }
      else if (!event.shiftKey && document.activeElement === lastNode) { event.preventDefault(); firstNode.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus?.(); };
  }, [onClose]);

  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    mutation.mutate({
      name: form.get('name'), contact: form.get('contact'), service_id: form.get('service_id') ? Number(form.get('service_id')) : null,
      desired_date: form.get('desired_date') || '', comment: form.get('comment') || '', website: form.get('website') || ''
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="booking-title" onMouseDown={(e) => e.stopPropagation()}>
        <button className="modal__close" aria-label="Закрыть" onClick={onClose}><X/></button>
        {!sent ? <><p className="section-label">ОНЛАЙН-ЗАПИСЬ</p><h2 id="booking-title">Оставь заявку</h2><p className="modal__intro">Заявка сразу попадёт мастеру. После этого останется подтвердить удобное время.</p>
          <form className="booking-form" onSubmit={submit}>
            <label>Имя<input name="name" required minLength="2" placeholder="Как к тебе обращаться" /></label>
            <label>Телефон или Telegram<input name="contact" required minLength="3" placeholder="@username или номер" /></label>
            <label>Услуга<select name="service_id" defaultValue=""><option value="">Выбрать позже</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.price}</option>)}</select></label>
            <label>Желаемая дата<input name="desired_date" placeholder="Например: пятница после 16:00" /></label>
            <label>Комментарий<textarea name="comment" placeholder="Эффект, вопросы, пожелания" rows="3" /></label>
            <input className="hp-field" name="website" tabIndex="-1" autoComplete="off" aria-hidden="true" />
            {mutation.error && <div className="form-error" role="alert">{mutation.error.message}</div>}
            <button className="button button--primary button--wide" disabled={mutation.isPending} type="submit">{mutation.isPending ? 'Отправляем…' : <>Отправить заявку <Send size={15}/></>}</button>
          </form></> : <div className="success-state"><Check size={42}/><h2>Заявка принята</h2><p>Она уже появилась в админке Aster Nastya.</p>{settings.telegram && <a className="button button--primary" href={settings.telegram} target="_blank" rel="noreferrer">Написать ещё в Telegram</a>}</div>}
      </div>
    </div>
  );
}

function PublicSkeleton() {
  return <div className="public-state"><div className="state-mark">ASTER</div><div className="skeleton-line"/><div className="skeleton-line skeleton-line--short"/><span>Загружаем сайт</span></div>;
}
function PublicError({ onRetry }) {
  return <div className="public-state"><div className="state-mark">ASTER</div><h1>Сайт временно недоступен</h1><p>Не удалось получить контент.</p><button className="button button--primary" onClick={onRetry}>Повторить</button></div>;
}
