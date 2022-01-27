import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import Amplify, { API } from 'aws-amplify';
import awsconfig from '../../../aws-exports';
import "./stripe.css";
import { APP_PREFIX_PATH, CLOUDFRONT_URL } from 'configs/AppConfig'
import {
    Form,
    Checkbox,
    Button,
    message,
    List,
    Typography,
    Divider,
    Modal
  } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

Amplify.configure(awsconfig);
const apiName = 'playercardsapi';



// Make sure to call `loadStripe` outside of a component’s render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe("pk_test_51ImPBGBmIj8uNSAFM8oXBjlD5as93E1U94sdrgAD3GcgrwjVeuUpQpIgg9UCDoJDsGS7kxiUCRDIGwp3fF9U1lhS00tTql9r6F");

const ProductDisplay = (props) => {
    const [modalText, setModalText] = React.useState('Content of the modal');
    const [modalTitle, setModalTitle] = React.useState('')
    const [modalModalVisible, setModalVisible] = React.useState(false);

    const showModal = () => {
        setModalVisible(true);
      };

    return props.membership ? (
        <>
            <div className="product">
                <img
                    width="200"
                    height="200"
                    src={`${CLOUDFRONT_URL}${props.membership.league_info.logo_url}`}
                    alt={props.membership.league_info.name}
                />
                <br/>
                <br/>
                <div className="description">
                    <h3>{props.membership.name}</h3>
                    <h5>{`${props.membership.priceAmount}.00 ${props.membership.priceCurrency}`}</h5>
                </div>
            </div>
            <Button 
                type="primary" 
                id="checkout-button"
                disabled={!props.checkoutEnabled}
                role="link" 
                onClick={() => {
                    setModalTitle('Please Wait.');
                    setModalText('Please wait while we prepare for checkout...');
                    // setConfirmLoading(true);
                    showModal();
                    props.handleClick(props.membership, props.selectedCardTypes)
                }}
                >
                Purchase Membership
            </Button>
            <Modal
            title={modalTitle}
            bodyStyle={{'text-align': 'center'}}
            style={{'text-align': 'center'}}
            visible={modalModalVisible}
            // onOk={handleOk}
            // confirmLoading={confirmLoading}
            // onCancel={handleCancel}
            width={500}
            centered
            closable={false}
            footer={null}
            >
                <p
                    style={{'text-align': 'center'}}
                >
                    {modalText}
                    </p>
                <LoadingOutlined
                    style={{'font-size': '5em'}}
                />
            </Modal>
        </>
        ) :
        null
    }

const Message = ({ message }) => (
  <section>
    <p>{message}</p>
  </section>
);

const App = (props) => {
    // console.log(props)


    const [messageText, setMessageText] = useState("");
    useEffect(() => {
        // Check to see if this is a redirect back from Checkout
        const query = new URLSearchParams(window.location.search);

        if (query.get("success")) {
            //update membership payment status to PAID
        setMessageText("Order placed! You will receive an email confirmation.");
        }

        if (query.get("cancelled")) {
        setMessageText(
            "Order canceled -- continue to shop around and checkout when you're ready."
        );
        }
    }, []);

    const handleClick = async (membership, selectedCards) => {
        console.log(membership)
        const stripe = await stripePromise;
		const key = 'Preparing checkout';
        // message.loading({ 
        //     content: 'Preparing checkout. Please wait...', 
        //     key,
        //     duration: 0
        // });
        setTimeout(() => {
            try {
                
                const cloudfront_logo_url = membership.league_info.logo_url ? `${CLOUDFRONT_URL}${membership.league_info.logo_url}` : ''
                const path = '/pay/stripe/session';
                const myInit = {
                    headers: {},
                    response: true,
                    body: {...membership, 
                        full_league_logo_url: cloudfront_logo_url,
                        selectedCards : selectedCards
                    },
                }
                
                API.post(apiName, path, myInit)
                .then(res => {
                    console.log('session response', res)
                    const result = stripe.redirectToCheckout({
                        sessionId: res.data,
                    });
                    if (result.error) {
                        // If `redirectToCheckout` fails due to a browser or network
                        // error, display the localized error message to your customer
                        // using `result.error.message`.
                        console.log(result.error)

                        message.error({ 
                            content: `Something went wrong ${result.error.message}`, 
                            key,
                            duration: 4
                        });
                    }

                })

            }
            catch(err) {
                message.error({ 
                    content: `Something went wrong ${err}`, 
                    key,
                    duration: 4
                });
            }
        }, 10000);

    };

    return (
        <ProductDisplay handleClick={handleClick} {...props}/>
    );
}

export default App;