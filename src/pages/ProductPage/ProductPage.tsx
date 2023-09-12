import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import Select from 'react-select';

import classNames from 'classnames';
import { size } from 'config/size';
import { type Swiper as SwiperRef } from 'swiper';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/thumbs';
import { Navigation, Pagination, Thumbs } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

import { api } from '@api/client';
import { Image, LocalizedString, Price } from '@commercetools/platform-sdk';
import { Breadcrumbs } from '@components/Breadcrumbs/Breadcrumbs';
import { Button } from '@components/Button';
import { Fancybox } from '@components/Fancybox/Fancybox';
import { Loader } from '@components/Loader';
import { createCart, updateCart } from '@store/features/auth/cartApi';
import { useAppDispatch, useAppSelector } from '@store/hooks';

import styles from './ProductPage.module.css';

interface Product {
  id: string;
  name: LocalizedString;
  description?: LocalizedString;
  masterVariant: {
    images?: Image[];
    prices?: Price[];
    sku?: string;
  };
}

export const ProductPage = () => {
  const [data, setData] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const cartId = useAppSelector((state) => state.auth.cart?.id);
  const cartVersion = useAppSelector((state) => state.auth.cart?.version);
  const swiperRef = useRef<SwiperRef>();

  const arrImage: string[] = [];
  const { name, description, masterVariant } = data || ({} as Product);
  const { images, prices } = masterVariant || ({} as Product);
  images?.forEach((item: Image) => {
    arrImage.push(item.url);
  });
  const price = prices ? prices[0].value.centAmount / 100 : 0;
  const discount = prices ? prices[0].discounted?.value.centAmount : 0;
  const code = prices ? prices[0].value.currencyCode : 'EUR';
  const country = prices ? prices[0].country : 'eu';
  const correctPrice = new Intl.NumberFormat(country, {
    style: 'currency',
    currency: code,
  }).format(price);

  const handleAddToCart = async () => {
    try {
      setLoading(true);
      if (cartId && cartVersion) {
        await dispatch(
          updateCart({
            cartId,
            body: {
              version: cartVersion,
              actions: [{ action: 'addLineItem', sku: masterVariant?.sku }],
            },
          })
        ).unwrap();
      } else {
        await dispatch(createCart({ currency: 'USD', lineItems: [{ sku: masterVariant?.sku }] })).unwrap();
      }
    } catch (error) {
      toast.error('Error with add to cart');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const getProduct = async (id: string) => {
      let response;
      try {
        setLoading(true);
        response = await api.request.productProjections().withId({ ID: id }).get().execute();
        return response.body;
      } catch (error) {
        return false;
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      getProduct(id).then((response) => {
        if (response) {
          setData(response);
        }
      });
    }
  }, [id]);

  return (
    <div>
      {!loading && <Breadcrumbs productDetail={data ? data.name : undefined} />}
      <section className={styles.product}>
        {loading && <Loader pageLoader />}
        <div className={styles.img}>
          <Fancybox
            options={{
              Carousel: {
                infinite: false,
              },
            }}
          >
            <Swiper
              navigation
              pagination={{ clickable: true }}
              thumbs={{ swiper: swiperRef.current }}
              modules={[Navigation, Thumbs, Pagination]}
              className='mySwiper2'
            >
              {arrImage.map((arrImage, index) => (
                <SwiperSlide key={arrImage} virtualIndex={index}>
                  <a data-fancybox='gallery' href={arrImage}>
                    <img src={arrImage} alt={`картинка ${index}`} width='100%' height='100%' />
                  </a>
                </SwiperSlide>
              ))}
            </Swiper>
            <Swiper
              onSwiper={(swiper) => {
                swiperRef.current = swiper;
              }}
              slidesPerView={arrImage.length}
              modules={[Thumbs]}
              className='mySwiper'
            >
              {arrImage.map((arrImage, index) => (
                <SwiperSlide key={arrImage} virtualIndex={index}>
                  <img src={arrImage} alt={`картинка ${index}`} width='70' height='70' />
                </SwiperSlide>
              ))}
            </Swiper>
          </Fancybox>
        </div>
        {!loading && (
          <div className={styles.content}>
            <h1 className={styles.title}>{name?.en}</h1>
            <div
              className={classNames(styles.price__current, {
                [styles.price__discount]: discount,
              })}
            >
              <span>{`${correctPrice} ${code}`}</span>
              {discount && (
                <span>
                  {discount / 100}&nbsp;
                  {code}
                </span>
              )}
            </div>

            <p className={styles.description}>{description?.en}</p>
            <Select placeholder='Choose size' options={size} />
            <Button type='button' className={styles.button} primary onClick={handleAddToCart}>
              Add to Cart
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};
